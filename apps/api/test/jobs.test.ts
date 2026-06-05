import { describe, expect, it } from "vitest";

import { prisma } from "@acme/db";

import { GET as list, POST as create } from "@/app/api/v1/jobs/route";
import {
  DELETE as destroy,
  GET as show,
  PATCH as update,
} from "@/app/api/v1/jobs/[id]/route";
import { POST as transition } from "@/app/api/v1/jobs/[id]/transition/route";

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

describe("POST /jobs", () => {
  it("starts at requested and ignores status in the body", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const response = await create(
      request("POST", "/api/v1/jobs", {
        token,
        body: {
          customer_id: customer.id,
          title: "Walk-in cooler icing over",
          status: "completed",
          priority: "urgent",
        },
      }),
      ctx(),
    );
    expect(response.status).toBe(201);
    const parsed = await body(response);
    expect(parsed["status"]).toBe("requested");
    expect(parsed["priority"]).toBe("urgent");
    expect(parsed["appointments"]).toEqual([]);
    expect(parsed["job_parts"]).toEqual([]);
    expect(parsed["invoice_record_id"]).toBeNull();
  });

  it("rejects an unknown customer", async () => {
    const { token } = await signIn();
    const response = await create(
      request("POST", "/api/v1/jobs", {
        token,
        body: { customer_id: 4242, title: "No heat" },
      }),
      ctx(),
    );
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toEqual({
      code: "validation_failed",
      message: "customer_id must exist",
      fields: { customer_id: "must exist" },
    });
  });
});

describe("GET /jobs", () => {
  it("filters by a comma-separated status list", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    await makeJob(customer.id, { status: "requested" });
    await makeJob(customer.id, { status: "scheduled" });
    await makeJob(customer.id, { status: "cancelled" });

    const response = await list(
      request("GET", "/api/v1/jobs?status=requested,scheduled", { token }),
      ctx(),
    );
    expect((await body(response))["total"]).toBe(2);
  });

  it("rejects a status outside the enum", async () => {
    const { token } = await signIn();
    const response = await list(
      request("GET", "/api/v1/jobs?status=open", { token }),
      ctx(),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("unknown status");
  });

  it("filters by priority, customer and title substring", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const other = await makeCustomer({ name: "Two Rivers" });
    await makeJob(customer.id, { title: "Furnace not igniting", priority: "urgent" });
    await makeJob(other.id, { title: "Backflow test" });

    const byPriority = await list(
      request("GET", "/api/v1/jobs?priority=urgent", { token }),
      ctx(),
    );
    expect((await body(byPriority))["total"]).toBe(1);

    const byCustomer = await list(
      request("GET", `/api/v1/jobs?customer_id=${other.id}`, { token }),
      ctx(),
    );
    expect((await body(byCustomer))["total"]).toBe(1);

    const byTitle = await list(request("GET", "/api/v1/jobs?q=furnace", { token }), ctx());
    expect((await body(byTitle))["total"]).toBe(1);
  });

  it("returns the flat shape without nested arrays", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    await makeJob(customer.id);
    const response = await list(request("GET", "/api/v1/jobs", { token }), ctx());
    const items = (await body(response))["items"] as Array<Record<string, unknown>>;
    expect(items[0]).not.toHaveProperty("appointments");
    expect(items[0]).not.toHaveProperty("job_parts");
  });
});

describe("GET /jobs/:id", () => {
  it("nests appointments, job parts and the invoice id", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const technician = await makeTechnician();
    const job = await makeJob(customer.id, { status: "in_progress" });
    await makeAppointment(job.id, technician.id);
    const part = await makePart({ onHand: 5 });
    await prisma.jobPart.create({
      data: { jobId: job.id, partId: part.id, quantity: 2, unitPriceCents: 1299 },
    });

    const response = await show(
      request("GET", `/api/v1/jobs/${job.id}`, { token }),
      ctx({ id: String(job.id) }),
    );
    const parsed = await body(response);
    expect((parsed["appointments"] as unknown[]).length).toBe(1);
    expect((parsed["job_parts"] as unknown[]).length).toBe(1);
    expect(parsed["invoice_record_id"]).toBeNull();
    const appointment = (parsed["appointments"] as Array<Record<string, unknown>>)[0]!;
    expect(appointment["scheduled_start"]).toBe("2025-03-12T13:00:00Z");
  });
});

describe("PATCH /jobs/:id", () => {
  it("updates fields but never status", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const response = await update(
      request("PATCH", `/api/v1/jobs/${job.id}`, {
        token,
        body: { title: "Compressor short-cycling", status: "completed" },
      }),
      ctx({ id: String(job.id) }),
    );
    const parsed = await body(response);
    expect(parsed["title"]).toBe("Compressor short-cycling");
    expect(parsed["status"]).toBe("requested");
  });
});

describe("POST /jobs/:id/transition", () => {
  it("walks the legal path to completed", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const technician = await makeTechnician();
    const job = await makeJob(customer.id);
    await makeAppointment(job.id, technician.id);

    for (const status of ["scheduled", "in_progress", "completed"]) {
      const response = await transition(
        request("POST", `/api/v1/jobs/${job.id}/transition`, {
          token,
          body: { status },
        }),
        ctx({ id: String(job.id) }),
      );
      expect(response.status).toBe(200);
      expect((await body(response))["status"]).toBe(status);
    }
  });

  it("requires an appointment before scheduling", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const response = await transition(
      request("POST", `/api/v1/jobs/${job.id}/transition`, {
        token,
        body: { status: "scheduled" },
      }),
      ctx({ id: String(job.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe(
      "a job needs an appointment before it can be scheduled",
    );
  });

  it("409s on an illegal move with both statuses in the message", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const response = await transition(
      request("POST", `/api/v1/jobs/${job.id}/transition`, {
        token,
        body: { status: "completed" },
      }),
      ctx({ id: String(job.id) }),
    );
    expect(response.status).toBe(409);
    expect(await errorOf(response)).toEqual({
      code: "invalid_transition",
      message: "cannot move a job from requested to completed",
    });
  });

  it("never grants invoiced directly, even from completed", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id, { status: "completed" });
    const response = await transition(
      request("POST", `/api/v1/jobs/${job.id}/transition`, {
        token,
        body: { status: "invoiced" },
      }),
      ctx({ id: String(job.id) }),
    );
    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe("invalid_transition");
  });

  it("400s on a status outside the enum", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const response = await transition(
      request("POST", `/api/v1/jobs/${job.id}/transition`, {
        token,
        body: { status: "done" },
      }),
      ctx({ id: String(job.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("unknown status");
  });

  it("allows cancelling from any pre-completed state", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    for (const status of ["requested", "scheduled", "in_progress"] as const) {
      const job = await makeJob(customer.id, { status });
      const response = await transition(
        request("POST", `/api/v1/jobs/${job.id}/transition`, {
          token,
          body: { status: "cancelled" },
        }),
        ctx({ id: String(job.id) }),
      );
      expect(response.status, status).toBe(200);
    }
  });
});

describe("DELETE /jobs/:id", () => {
  it("refuses to delete an invoiced job", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id, { status: "invoiced" });
    const response = await destroy(
      request("DELETE", `/api/v1/jobs/${job.id}`, { token }),
      ctx({ id: String(job.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("an invoiced job cannot be deleted");
  });

  it("returns recorded parts to stock on delete", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id, { status: "in_progress" });
    const part = await makePart({ onHand: 3 });
    await prisma.jobPart.create({
      data: { jobId: job.id, partId: part.id, quantity: 2, unitPriceCents: 1299 },
    });

    const response = await destroy(
      request("DELETE", `/api/v1/jobs/${job.id}`, { token }),
      ctx({ id: String(job.id) }),
    );
    expect(response.status).toBe(204);
    const stock = await prisma.stockLevel.findUniqueOrThrow({ where: { partId: part.id } });
    expect(stock.quantityOnHand).toBe(5);
    expect(await prisma.job.count()).toBe(0);
  });
});
