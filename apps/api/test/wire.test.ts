import { describe, expect, it } from "vitest";

import { GET as showJob } from "@/app/api/v1/jobs/[id]/route";
import { GET as listCustomers } from "@/app/api/v1/customers/route";

import {
  body,
  ctx,
  makeAppointment,
  makeCustomer,
  makeJob,
  makeTechnician,
  request,
  signIn,
} from "./helpers";

describe("wire format", () => {
  it("serializes timestamps as whole-second UTC with a Z suffix", async () => {
    const { token } = await signIn();
    await makeCustomer();
    const response = await listCustomers(request("GET", "/api/v1/customers", { token }), ctx());
    const items = (await body(response))["items"] as Array<Record<string, unknown>>;
    const createdAt = items[0]?.["created_at"] as string;
    expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("keeps the job detail keys in contract order", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const technician = await makeTechnician();
    const job = await makeJob(customer.id);
    await makeAppointment(job.id, technician.id);

    const response = await showJob(
      request("GET", `/api/v1/jobs/${job.id}`, { token }),
      ctx({ id: String(job.id) }),
    );
    const parsed = await body(response);
    expect(Object.keys(parsed)).toEqual([
      "id",
      "customer_id",
      "title",
      "description",
      "priority",
      "status",
      "appointments",
      "job_parts",
      "invoice_record_id",
      "created_at",
      "updated_at",
    ]);
    const appointment = (parsed["appointments"] as Array<Record<string, unknown>>)[0]!;
    expect(Object.keys(appointment)).toEqual([
      "id",
      "job_id",
      "technician_id",
      "scheduled_start",
      "scheduled_end",
      "completion_notes",
      "created_at",
      "updated_at",
    ]);
  });

  it("keeps snake_case keys everywhere", async () => {
    const { token } = await signIn();
    await makeTechnician();
    const { GET: listTechs } = await import("@/app/api/v1/technicians/route");
    const response = await listTechs(request("GET", "/api/v1/technicians", { token }), ctx());
    const items = (await body(response))["items"] as Array<Record<string, unknown>>;
    for (const key of Object.keys(items[0]!)) {
      expect(key).toMatch(/^[a-z0-9_]+$/);
    }
    expect(items[0]).toHaveProperty("hourly_cost_cents");
    expect(items[0]).toHaveProperty("skill_tags");
  });
});
