import { describe, expect, it } from "vitest";

import { prisma } from "@acme/db";

import { GET as listParts, POST as createPart } from "@/app/api/v1/parts/route";
import {
  DELETE as destroyPart,
  PATCH as updatePart,
} from "@/app/api/v1/parts/[id]/route";
import { GET as listStock } from "@/app/api/v1/stock-levels/route";
import { POST as adjust } from "@/app/api/v1/stock-levels/[partId]/adjust/route";

import {
  body,
  ctx,
  errorOf,
  makeCustomer,
  makeJob,
  makePart,
  request,
  signIn,
} from "./helpers";

describe("POST /parts", () => {
  it("creates the part with an empty stock level", async () => {
    const { token } = await signIn();
    const response = await createPart(
      request("POST", "/api/v1/parts", {
        token,
        body: {
          sku: "CAP-3555",
          name: "Run capacitor 35/5 uF",
          unit_cost_cents: 620,
          unit_price_cents: 1150,
        },
      }),
      ctx(),
    );
    expect(response.status).toBe(201);
    const parsed = await body(response);
    const stock = await prisma.stockLevel.findUniqueOrThrow({
      where: { partId: parsed["id"] as number },
    });
    expect(stock.quantityOnHand).toBe(0);
  });

  it("rejects a price below cost", async () => {
    const { token } = await signIn();
    const response = await createPart(
      request("POST", "/api/v1/parts", {
        token,
        body: { sku: "A-1", name: "Widget", unit_cost_cents: 200, unit_price_cents: 150 },
      }),
      ctx(),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("unit price cannot be below unit cost");
  });

  it("rejects a duplicate sku", async () => {
    const { token } = await signIn();
    await makePart({ sku: "IGN-4420" });
    const response = await createPart(
      request("POST", "/api/v1/parts", {
        token,
        body: { sku: "IGN-4420", name: "Igniter", unit_cost_cents: 1, unit_price_cents: 2 },
      }),
      ctx(),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("sku is already in use");
  });
});

describe("PATCH /parts/:id", () => {
  it("enforces price >= cost against merged values", async () => {
    const { token } = await signIn();
    const part = await makePart(); // cost 780, price 1299
    const response = await updatePart(
      request("PATCH", `/api/v1/parts/${part.id}`, {
        token,
        body: { unit_cost_cents: 1500 },
      }),
      ctx({ id: String(part.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("unit price cannot be below unit cost");
  });

  it("applies a legal update", async () => {
    const { token } = await signIn();
    const part = await makePart();
    const response = await updatePart(
      request("PATCH", `/api/v1/parts/${part.id}`, {
        token,
        body: { unit_price_cents: 1399 },
      }),
      ctx({ id: String(part.id) }),
    );
    expect((await body(response))["unit_price_cents"]).toBe(1399);
  });
});

describe("GET /parts", () => {
  it("matches sku or name with ?q", async () => {
    const { token } = await signIn();
    await makePart({ sku: "IGN-4420" });
    await makePart({ sku: "CAP-3555", name: "Run capacitor" });

    const bySku = await listParts(request("GET", "/api/v1/parts?q=ign", { token }), ctx());
    expect((await body(bySku))["total"]).toBe(1);
    const byName = await listParts(
      request("GET", "/api/v1/parts?q=capacitor", { token }),
      ctx(),
    );
    expect((await body(byName))["total"]).toBe(1);
  });
});

describe("DELETE /parts/:id", () => {
  it("is admin-only", async () => {
    const { token } = await signIn("dispatcher");
    const part = await makePart();
    const response = await destroyPart(
      request("DELETE", `/api/v1/parts/${part.id}`, { token }),
      ctx({ id: String(part.id) }),
    );
    expect(response.status).toBe(403);
  });

  it("refuses when the part has been used on a job", async () => {
    const { token } = await signIn("admin");
    const part = await makePart({ onHand: 5 });
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    await prisma.jobPart.create({
      data: { jobId: job.id, partId: part.id, quantity: 1, unitPriceCents: 1299 },
    });
    const response = await destroyPart(
      request("DELETE", `/api/v1/parts/${part.id}`, { token }),
      ctx({ id: String(part.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe(
      "part has been used on jobs and cannot be deleted",
    );
  });

  it("removes the part and its stock level", async () => {
    const { token } = await signIn("admin");
    const part = await makePart();
    const response = await destroyPart(
      request("DELETE", `/api/v1/parts/${part.id}`, { token }),
      ctx({ id: String(part.id) }),
    );
    expect(response.status).toBe(204);
    expect(await prisma.stockLevel.count()).toBe(0);
  });
});

describe("GET /stock-levels", () => {
  it("nests the part and orders by part id", async () => {
    const { token } = await signIn();
    const first = await makePart({ sku: "AAA-1", onHand: 4 });
    await makePart({ sku: "BBB-2", onHand: 9 });

    const response = await listStock(request("GET", "/api/v1/stock-levels", { token }), ctx());
    const parsed = await body(response);
    expect(parsed["total"]).toBe(2);
    const items = parsed["items"] as Array<Record<string, unknown>>;
    expect(items[0]?.["part_id"]).toBe(first.id);
    expect((items[0]?.["part"] as Record<string, unknown>)["sku"]).toBe("AAA-1");
    expect(items[0]?.["quantity_on_hand"]).toBe(4);
  });

  it("filters by part_id", async () => {
    const { token } = await signIn();
    await makePart({ sku: "AAA-1" });
    const second = await makePart({ sku: "BBB-2" });
    const response = await listStock(
      request("GET", `/api/v1/stock-levels?part_id=${second.id}`, { token }),
      ctx(),
    );
    expect((await body(response))["total"]).toBe(1);
  });
});

describe("POST /stock-levels/:partId/adjust", () => {
  it("applies positive and negative deltas", async () => {
    const { token } = await signIn();
    const part = await makePart({ onHand: 5 });

    const up = await adjust(
      request("POST", `/api/v1/stock-levels/${part.id}/adjust`, {
        token,
        body: { delta: 7 },
      }),
      ctx({ partId: String(part.id) }),
    );
    expect(up.status).toBe(200);
    expect((await body(up))["quantity_on_hand"]).toBe(12);

    const down = await adjust(
      request("POST", `/api/v1/stock-levels/${part.id}/adjust`, {
        token,
        body: { delta: -12 },
      }),
      ctx({ partId: String(part.id) }),
    );
    expect((await body(down))["quantity_on_hand"]).toBe(0);
  });

  it("409s when the result would be negative, writing nothing", async () => {
    const { token } = await signIn();
    const part = await makePart({ onHand: 3 });
    const response = await adjust(
      request("POST", `/api/v1/stock-levels/${part.id}/adjust`, {
        token,
        body: { delta: -4 },
      }),
      ctx({ partId: String(part.id) }),
    );
    expect(response.status).toBe(409);
    expect(await errorOf(response)).toEqual({
      code: "insufficient_stock",
      message: "not enough stock on hand",
    });
    const stock = await prisma.stockLevel.findUniqueOrThrow({ where: { partId: part.id } });
    expect(stock.quantityOnHand).toBe(3);
  });

  it("rejects a zero delta", async () => {
    const { token } = await signIn();
    const part = await makePart({ onHand: 3 });
    const response = await adjust(
      request("POST", `/api/v1/stock-levels/${part.id}/adjust`, {
        token,
        body: { delta: 0 },
      }),
      ctx({ partId: String(part.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("delta must not be zero");
  });

  it("rejects a fractional delta", async () => {
    const { token } = await signIn();
    const part = await makePart({ onHand: 3 });
    const response = await adjust(
      request("POST", `/api/v1/stock-levels/${part.id}/adjust`, {
        token,
        body: { delta: 1.5 },
      }),
      ctx({ partId: String(part.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("delta must be an integer");
  });

  it("404s for a part that does not exist", async () => {
    const { token } = await signIn();
    const response = await adjust(
      request("POST", "/api/v1/stock-levels/999/adjust", { token, body: { delta: 1 } }),
      ctx({ partId: "999" }),
    );
    expect(response.status).toBe(404);
  });
});
