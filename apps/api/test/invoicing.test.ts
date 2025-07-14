import { describe, expect, it } from "vitest";

import { prisma } from "@acme/db";

import { POST as addPart } from "@/app/api/v1/jobs/[id]/parts/route";
import { DELETE as removePart } from "@/app/api/v1/job-parts/[id]/route";
import { POST as invoice } from "@/app/api/v1/jobs/[id]/invoice/route";
import { GET as listInvoices } from "@/app/api/v1/invoice-records/route";
import { GET as showInvoice } from "@/app/api/v1/invoice-records/[id]/route";

import {
  body,
  ctx,
  errorOf,
  makeAppointment,
  makeCustomer,
  makeJob,
  makePart,
  makeTechnician,
  request,
  signIn,
} from "./helpers";

describe("POST /jobs/:id/parts", () => {
  it("records usage and decrements stock in one step", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id, { status: "in_progress" });
    const part = await makePart({ onHand: 5 });

    const response = await addPart(
      request("POST", `/api/v1/jobs/${job.id}/parts`, {
        token,
        body: { part_id: part.id, quantity: 3 },
      }),
      ctx({ id: String(job.id) }),
    );
    expect(response.status).toBe(201);
    const parsed = await body(response);
    expect(parsed["quantity"]).toBe(3);
    expect(parsed["unit_price_cents"]).toBe(1299);
    const stock = await prisma.stockLevel.findUniqueOrThrow({ where: { partId: part.id } });
    expect(stock.quantityOnHand).toBe(2);
  });

  it("409s and writes nothing when stock is short", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id, { status: "in_progress" });
    const part = await makePart({ onHand: 2 });

    const response = await addPart(
      request("POST", `/api/v1/jobs/${job.id}/parts`, {
        token,
        body: { part_id: part.id, quantity: 3 },
      }),
      ctx({ id: String(job.id) }),
    );
    expect(response.status).toBe(409);
    expect(await errorOf(response)).toEqual({
      code: "insufficient_stock",
      message: "not enough stock on hand",
    });
    expect(await prisma.jobPart.count()).toBe(0);
    const stock = await prisma.stockLevel.findUniqueOrThrow({ where: { partId: part.id } });
    expect(stock.quantityOnHand).toBe(2);
  });

  it("rejects a non-positive quantity with the contract message", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const part = await makePart({ onHand: 5 });

    const response = await addPart(
      request("POST", `/api/v1/jobs/${job.id}/parts`, {
        token,
        body: { part_id: part.id, quantity: 0 },
      }),
      ctx({ id: String(job.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("quantity must be greater than zero");
  });

  it("keeps two recordings of the same part as two rows", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id, { status: "in_progress" });
    const part = await makePart({ onHand: 10 });

    for (let i = 0; i < 2; i++) {
      await addPart(
        request("POST", `/api/v1/jobs/${job.id}/parts`, {
          token,
          body: { part_id: part.id, quantity: 1 },
        }),
        ctx({ id: String(job.id) }),
      );
    }
    expect(await prisma.jobPart.count({ where: { jobId: job.id } })).toBe(2);
  });

  it("rejects closed jobs, naming the status", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const part = await makePart({ onHand: 5 });
    for (const status of ["invoiced", "cancelled"] as const) {
      const job = await makeJob(customer.id, { status });
      const response = await addPart(
        request("POST", `/api/v1/jobs/${job.id}/parts`, {
          token,
          body: { part_id: part.id, quantity: 1 },
        }),
        ctx({ id: String(job.id) }),
      );
      expect(response.status, status).toBe(400);
      expect((await errorOf(response)).message).toBe(
        `parts cannot be added to a job that is ${status}`,
      );
    }
  });
});

describe("DELETE /job-parts/:id", () => {
  it("returns the quantity to stock", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id, { status: "in_progress" });
    const part = await makePart({ onHand: 1 });
    const jobPart = await prisma.jobPart.create({
      data: { jobId: job.id, partId: part.id, quantity: 4, unitPriceCents: 1299 },
    });

    const response = await removePart(
      request("DELETE", `/api/v1/job-parts/${jobPart.id}`, { token }),
      ctx({ id: String(jobPart.id) }),
    );
    expect(response.status).toBe(204);
    const stock = await prisma.stockLevel.findUniqueOrThrow({ where: { partId: part.id } });
    expect(stock.quantityOnHand).toBe(5);
  });

  it("refuses on an invoiced job", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id, { status: "invoiced" });
    const part = await makePart({ onHand: 5 });
    const jobPart = await prisma.jobPart.create({
      data: { jobId: job.id, partId: part.id, quantity: 1, unitPriceCents: 1299 },
    });

    const response = await removePart(
      request("DELETE", `/api/v1/job-parts/${jobPart.id}`, { token }),
      ctx({ id: String(jobPart.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("an invoiced job cannot be changed");
  });
});

async function caseFourJob(token: string) {
  // Conformance case 4: 1.5h at 8000¢/h on a weekday, 3 × 1299¢ parts, urgent.
  const customer = await makeCustomer();
  const technician = await makeTechnician({ name: "Dana Reyes", hourlyCostCents: 8000 });
  const job = await makeJob(customer.id, { priority: "urgent", status: "in_progress" });
  await makeAppointment(job.id, technician.id, {
    scheduledStart: new Date("2025-03-12T13:00:00Z"),
    scheduledEnd: new Date("2025-03-12T14:30:00Z"),
  });
  const part = await makePart({ onHand: 10 });
  await addPart(
    request("POST", `/api/v1/jobs/${job.id}/parts`, {
      token,
      body: { part_id: part.id, quantity: 3 },
    }),
    ctx({ id: String(job.id) }),
  );
  await prisma.job.update({ where: { id: job.id }, data: { status: "completed" } });
  return job;
}

describe("POST /jobs/:id/invoice", () => {
  it("prices conformance case 4 and moves the job to invoiced", async () => {
    const { token } = await signIn();
    const job = await caseFourJob(token);

    const response = await invoice(
      request("POST", `/api/v1/jobs/${job.id}/invoice`, { token }),
      ctx({ id: String(job.id) }),
    );
    expect(response.status).toBe(201);
    const parsed = await body(response);
    expect(parsed["labor_cents"]).toBe(19200);
    expect(parsed["parts_cents"]).toBe(3897);
    expect(parsed["total_cents"]).toBe(25407);

    const lines = parsed["line_items"] as Array<Record<string, unknown>>;
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({
      kind: "labor",
      description: "Dana Reyes — 1.5h on 2025-03-12",
      quantity: 1.5,
      unit_cents: 8000,
      amount_cents: 19200,
      weekend: false,
    });
    expect(lines[1]).toEqual({
      kind: "part",
      description: "IGN-4420 — Hot surface igniter",
      quantity: 3,
      unit_cents: 1299,
      amount_cents: 3897,
      weekend: false,
    });

    const updated = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(updated.status).toBe("invoiced");
  });

  it("applies the weekend surcharge per appointment", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const technician = await makeTechnician({ hourlyCostCents: 5000 });
    const job = await makeJob(customer.id, { status: "completed" });
    await makeAppointment(job.id, technician.id, {
      scheduledStart: new Date("2025-03-12T09:00:00Z"),
      scheduledEnd: new Date("2025-03-12T11:00:00Z"),
    });
    await makeAppointment(job.id, technician.id, {
      scheduledStart: new Date("2025-03-16T09:00:00Z"), // Sunday
      scheduledEnd: new Date("2025-03-16T10:00:00Z"),
    });

    const response = await invoice(
      request("POST", `/api/v1/jobs/${job.id}/invoice`, { token }),
      ctx({ id: String(job.id) }),
    );
    const parsed = await body(response);
    // 16000 weekday + 9200 surcharged sunday, per fixture case 5.
    expect(parsed["labor_cents"]).toBe(25200);
    expect(parsed["total_cents"]).toBe(25200);
    const lines = parsed["line_items"] as Array<Record<string, unknown>>;
    expect(lines.map((line) => line["weekend"])).toEqual([false, true]);
  });

  it("409s when the job is not completed", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id, { status: "in_progress" });
    const response = await invoice(
      request("POST", `/api/v1/jobs/${job.id}/invoice`, { token }),
      ctx({ id: String(job.id) }),
    );
    expect(response.status).toBe(409);
    expect(await errorOf(response)).toEqual({
      code: "invalid_transition",
      message: "only a completed job can be invoiced",
    });
  });

  it("400s on a second invoice — the duplicate check wins", async () => {
    const { token } = await signIn();
    const job = await caseFourJob(token);
    await invoice(request("POST", `/api/v1/jobs/${job.id}/invoice`, { token }), ctx({ id: String(job.id) }));

    const again = await invoice(
      request("POST", `/api/v1/jobs/${job.id}/invoice`, { token }),
      ctx({ id: String(job.id) }),
    );
    expect(again.status).toBe(400);
    expect(await errorOf(again)).toEqual({
      code: "validation_failed",
      message: "job is already invoiced",
    });
  });
});

describe("GET /invoice-records", () => {
  it("lists with line items and filters by job and customer", async () => {
    const { token } = await signIn();
    const job = await caseFourJob(token);
    await invoice(request("POST", `/api/v1/jobs/${job.id}/invoice`, { token }), ctx({ id: String(job.id) }));

    const all = await body(
      await listInvoices(request("GET", "/api/v1/invoice-records", { token }), ctx()),
    );
    expect(all["total"]).toBe(1);
    const items = all["items"] as Array<Record<string, unknown>>;
    expect((items[0]?.["line_items"] as unknown[]).length).toBe(2);

    const byJob = await body(
      await listInvoices(
        request("GET", `/api/v1/invoice-records?job_id=${job.id}`, { token }),
        ctx(),
      ),
    );
    expect(byJob["total"]).toBe(1);

    const byCustomer = await body(
      await listInvoices(
        request("GET", `/api/v1/invoice-records?customer_id=${job.customerId}`, { token }),
        ctx(),
      ),
    );
    expect(byCustomer["total"]).toBe(1);

    const none = await body(
      await listInvoices(request("GET", "/api/v1/invoice-records?job_id=999", { token }), ctx()),
    );
    expect(none["total"]).toBe(0);
  });

  it("fetches a single record and 404s on a missing one", async () => {
    const { token } = await signIn();
    const job = await caseFourJob(token);
    const createdResponse = await invoice(
      request("POST", `/api/v1/jobs/${job.id}/invoice`, { token }),
      ctx({ id: String(job.id) }),
    );
    const id = (await body(createdResponse))["id"] as number;

    const found = await showInvoice(
      request("GET", `/api/v1/invoice-records/${id}`, { token }),
      ctx({ id: String(id) }),
    );
    expect(found.status).toBe(200);

    const missing = await showInvoice(
      request("GET", "/api/v1/invoice-records/999", { token }),
      ctx({ id: "999" }),
    );
    expect(missing.status).toBe(404);
    expect((await errorOf(missing)).message).toBe("invoice record not found");
  });
});
