import { describe, expect, it } from "vitest";

import { GET as list, POST as create } from "@/app/api/v1/technicians/route";
import {
  DELETE as destroy,
  GET as show,
  PATCH as update,
} from "@/app/api/v1/technicians/[id]/route";

import {
  body,
  ctx,
  errorOf,
  makeAppointment,
  makeCustomer,
  makeJob,
  makeTechnician,
  request,
  signIn,
} from "./helpers";

describe("POST /technicians", () => {
  it("stores canonical skill tags and echoes them as an array", async () => {
    const { token } = await signIn();
    const response = await create(
      request("POST", "/api/v1/technicians", {
        token,
        body: {
          name: "Rosa Vale",
          phone: "555-0111",
          skill_tags: ["HVAC", "hvac", " Refrigeration "],
          hourly_cost_cents: 8000,
        },
      }),
      ctx(),
    );
    expect(response.status).toBe(201);
    const parsed = await body(response);
    expect(parsed["skill_tags"]).toEqual(["hvac", "refrigeration"]);
    expect(parsed["is_active"]).toBe(true);
  });

  it("requires a positive hourly cost", async () => {
    const { token } = await signIn();
    const response = await create(
      request("POST", "/api/v1/technicians", {
        token,
        body: { name: "Rosa Vale", hourly_cost_cents: 0 },
      }),
      ctx(),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe(
      "hourly_cost_cents must be a positive integer",
    );
  });
});

describe("GET /technicians", () => {
  it("filters by exact skill tag", async () => {
    const { token } = await signIn();
    await makeTechnician({ skillTags: JSON.stringify(["hvac", "electrical"]) });
    await makeTechnician({
      name: "Sam Ortiz",
      skillTags: JSON.stringify(["hvac-commercial"]),
    });

    const response = await list(
      request("GET", "/api/v1/technicians?skill=hvac", { token }),
      ctx(),
    );
    const parsed = await body(response);
    expect(parsed["total"]).toBe(1);
    const items = parsed["items"] as Array<Record<string, unknown>>;
    expect(items[0]?.["name"]).toBe("Dana Reyes");
  });

  it("filters by is_active and rejects junk values", async () => {
    const { token } = await signIn();
    await makeTechnician();
    await makeTechnician({ name: "Ivy Sandoval", isActive: false });

    const active = await list(
      request("GET", "/api/v1/technicians?is_active=true", { token }),
      ctx(),
    );
    expect((await body(active))["total"]).toBe(1);

    const junk = await list(
      request("GET", "/api/v1/technicians?is_active=banana", { token }),
      ctx(),
    );
    expect(junk.status).toBe(400);
    expect((await errorOf(junk)).message).toBe("is_active must be true or false");
  });
});

describe("PATCH /technicians/:id", () => {
  it("replaces skill tags wholesale", async () => {
    const { token } = await signIn();
    const technician = await makeTechnician();
    const response = await update(
      request("PATCH", `/api/v1/technicians/${technician.id}`, {
        token,
        body: { skill_tags: ["plumbing"] },
      }),
      ctx({ id: String(technician.id) }),
    );
    expect((await body(response))["skill_tags"]).toEqual(["plumbing"]);
  });
});

describe("DELETE /technicians/:id", () => {
  it("is admin-only", async () => {
    const { token } = await signIn("dispatcher");
    const technician = await makeTechnician();
    const response = await destroy(
      request("DELETE", `/api/v1/technicians/${technician.id}`, { token }),
      ctx({ id: String(technician.id) }),
    );
    expect(response.status).toBe(403);
    expect((await errorOf(response)).code).toBe("forbidden");
  });

  it("refuses when appointments exist", async () => {
    const { token } = await signIn("admin");
    const technician = await makeTechnician();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    await makeAppointment(job.id, technician.id);

    const response = await destroy(
      request("DELETE", `/api/v1/technicians/${technician.id}`, { token }),
      ctx({ id: String(technician.id) }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe(
      "technician has appointments and cannot be deleted",
    );
  });

  it("deletes an unbooked technician for an admin", async () => {
    const { token } = await signIn("admin");
    const technician = await makeTechnician();
    const response = await destroy(
      request("DELETE", `/api/v1/technicians/${technician.id}`, { token }),
      ctx({ id: String(technician.id) }),
    );
    expect(response.status).toBe(204);
  });

  it("404s on a missing technician", async () => {
    const { token } = await signIn("admin");
    const response = await show(
      request("GET", "/api/v1/technicians/424242", { token }),
      ctx({ id: "424242" }),
    );
    expect(response.status).toBe(404);
    expect((await errorOf(response)).message).toBe("technician not found");
  });
});
