import { describe, expect, it } from "vitest";

import { prisma } from "@acme/db";

import { GET as list, POST as create } from "@/app/api/v1/customers/route";
import {
  DELETE as destroy,
  GET as show,
  PATCH as update,
} from "@/app/api/v1/customers/[id]/route";

import {
  body,
  ctx,
  errorOf,
  makeCustomer,
  makeJob,
  request,
  signIn,
} from "./helpers";

describe("GET /customers", () => {
  it("returns the pagination envelope", async () => {
    const { token } = await signIn();
    await makeCustomer();
    await makeCustomer({ name: "Two Rivers Brewing", serviceAddress: "88 Mill St" });

    const response = await list(request("GET", "/api/v1/customers", { token }), ctx());
    expect(response.status).toBe(200);
    const parsed = await body(response);
    expect(Object.keys(parsed)).toEqual(["items", "page", "per_page", "total"]);
    expect(parsed["total"]).toBe(2);
    expect(parsed["page"]).toBe(1);
    expect(parsed["per_page"]).toBe(20);
    const items = parsed["items"] as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(Object.keys(items[0]!)).toEqual([
      "id",
      "name",
      "contact_email",
      "phone",
      "service_address",
      "notes",
      "created_at",
      "updated_at",
    ]);
  });

  it("matches name or address with ?q, case-insensitively", async () => {
    const { token } = await signIn();
    await makeCustomer({ name: "Harbor Light Bakery" });
    await makeCustomer({ name: "Fern & Frond", serviceAddress: "204 Bloom Ave" });
    await makeCustomer({ name: "Delgado Auto", serviceAddress: "410 Industrial Way" });

    for (const q of ["harbor", "BLOOM"]) {
      const response = await list(
        request("GET", `/api/v1/customers?q=${q}`, { token }),
        ctx(),
      );
      expect((await body(response))["total"]).toBe(1);
    }
  });

  it("pages past the end with the real total", async () => {
    const { token } = await signIn();
    await makeCustomer();
    const response = await list(
      request("GET", "/api/v1/customers?page=5&per_page=10", { token }),
      ctx(),
    );
    const parsed = await body(response);
    expect(parsed["items"]).toEqual([]);
    expect(parsed["total"]).toBe(1);
    expect(parsed["page"]).toBe(5);
  });

  it("rejects junk pagination", async () => {
    const { token } = await signIn();
    for (const query of ["page=0", "page=abc", "per_page=-2", "per_page=1.5"]) {
      const response = await list(
        request("GET", `/api/v1/customers?${query}`, { token }),
        ctx(),
      );
      expect(response.status).toBe(400);
      expect(await errorOf(response)).toEqual({
        code: "validation_failed",
        message: "page and per_page must be positive integers",
      });
    }
  });

  it("clamps per_page to 100", async () => {
    const { token } = await signIn();
    const response = await list(
      request("GET", "/api/v1/customers?per_page=500", { token }),
      ctx(),
    );
    expect((await body(response))["per_page"]).toBe(100);
  });
});

describe("POST /customers", () => {
  it("creates and returns 201", async () => {
    const { token } = await signIn();
    const response = await create(
      request("POST", "/api/v1/customers", {
        token,
        body: { name: "Blue Heron Seafood", service_address: "3 Pier Four" },
      }),
      ctx(),
    );
    expect(response.status).toBe(201);
    const parsed = await body(response);
    expect(parsed["name"]).toBe("Blue Heron Seafood");
    expect(parsed["contact_email"]).toBeNull();
    expect(await prisma.customer.count()).toBe(1);
  });

  it("rejects a missing name", async () => {
    const { token } = await signIn();
    const response = await create(
      request("POST", "/api/v1/customers", {
        token,
        body: { service_address: "3 Pier Four" },
      }),
      ctx(),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("name is required");
  });

  it("rejects a body that is not json", async () => {
    const { token } = await signIn();
    const raw = new Request("http://api.test/api/v1/customers", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: "not json",
    });
    const response = await create(raw, ctx());
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("request body must be valid json");
  });
});

describe("GET /customers/:id", () => {
  it("returns the customer", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const response = await show(
      request("GET", `/api/v1/customers/${customer.id}`, { token }),
      ctx({ id: String(customer.id) }),
    );
    expect(response.status).toBe(200);
    expect((await body(response))["id"]).toBe(customer.id);
  });

  it("404s for unknown and non-numeric ids", async () => {
    const { token } = await signIn();
    for (const id of ["999", "abc"]) {
      const response = await show(
        request("GET", `/api/v1/customers/${id}`, { token }),
        ctx({ id }),
      );
      expect(response.status).toBe(404);
      expect(await errorOf(response)).toEqual({
        code: "not_found",
        message: "customer not found",
      });
    }
  });
});

describe("PATCH /customers/:id", () => {
  it("applies partial updates and clears nullables with explicit null", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const response = await update(
      request("PATCH", `/api/v1/customers/${customer.id}`, {
        token,
        body: { phone: null, notes: "Ring the side bell" },
      }),
      ctx({ id: String(customer.id) }),
    );
    expect(response.status).toBe(200);
    const parsed = await body(response);
    expect(parsed["phone"]).toBeNull();
    expect(parsed["notes"]).toBe("Ring the side bell");
    expect(parsed["name"]).toBe(customer.name);
  });
});

describe("DELETE /customers/:id", () => {
  it("deletes a customer without jobs", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const response = await destroy(
      request("DELETE", `/api/v1/customers/${customer.id}`, { token }),
      ctx({ id: String(customer.id) }),
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(await prisma.customer.count()).toBe(0);
  });

  it("refuses when the customer has jobs", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    await makeJob(customer.id);
    const response = await destroy(
      request("DELETE", `/api/v1/customers/${customer.id}`, { token }),
      ctx({ id: String(customer.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe(
      "customer has jobs and cannot be deleted",
    );
  });
});
