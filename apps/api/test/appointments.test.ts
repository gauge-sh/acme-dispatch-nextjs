import { describe, expect, it } from "vitest";

import { GET as list, POST as create } from "@/app/api/v1/appointments/route";
import {
  DELETE as destroy,
  PATCH as update,
} from "@/app/api/v1/appointments/[id]/route";

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

function appointmentBody(
  jobId: number,
  technicianId: number,
  start: string,
  end: string,
): Record<string, unknown> {
  return {
    job_id: jobId,
    technician_id: technicianId,
    scheduled_start: start,
    scheduled_end: end,
  };
}

describe("POST /appointments", () => {
  it("books a free slot", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const technician = await makeTechnician();

    const response = await create(
      request("POST", "/api/v1/appointments", {
        token,
        body: appointmentBody(
          job.id,
          technician.id,
          "2025-03-12T09:00:00Z",
          "2025-03-12T10:00:00Z",
        ),
      }),
      ctx(),
    );
    expect(response.status).toBe(201);
    expect((await body(response))["completion_notes"]).toBeNull();
  });

  it("409s when the technician is double-booked", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const technician = await makeTechnician();
    await makeAppointment(job.id, technician.id, {
      scheduledStart: new Date("2025-03-12T09:00:00Z"),
      scheduledEnd: new Date("2025-03-12T10:00:00Z"),
    });

    const response = await create(
      request("POST", "/api/v1/appointments", {
        token,
        body: appointmentBody(
          job.id,
          technician.id,
          "2025-03-12T09:30:00Z",
          "2025-03-12T10:30:00Z",
        ),
      }),
      ctx(),
    );
    expect(response.status).toBe(409);
    expect(await errorOf(response)).toEqual({
      code: "schedule_conflict",
      message: "technician is already booked for that time",
    });
  });

  it("allows touching endpoints", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const technician = await makeTechnician();
    await makeAppointment(job.id, technician.id, {
      scheduledStart: new Date("2025-03-12T09:00:00Z"),
      scheduledEnd: new Date("2025-03-12T10:00:00Z"),
    });

    const response = await create(
      request("POST", "/api/v1/appointments", {
        token,
        body: appointmentBody(
          job.id,
          technician.id,
          "2025-03-12T10:00:00Z",
          "2025-03-12T11:00:00Z",
        ),
      }),
      ctx(),
    );
    expect(response.status).toBe(201);
  });

  it("books the same slot for a different technician", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const first = await makeTechnician();
    const second = await makeTechnician({ name: "Sam Ortiz" });
    await makeAppointment(job.id, first.id);

    const response = await create(
      request("POST", "/api/v1/appointments", {
        token,
        body: appointmentBody(
          job.id,
          second.id,
          "2025-03-12T13:00:00Z",
          "2025-03-12T14:30:00Z",
        ),
      }),
      ctx(),
    );
    expect(response.status).toBe(201);
  });

  it("rejects an end at or before the start", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const technician = await makeTechnician();

    const response = await create(
      request("POST", "/api/v1/appointments", {
        token,
        body: appointmentBody(
          job.id,
          technician.id,
          "2025-03-12T10:00:00Z",
          "2025-03-12T10:00:00Z",
        ),
      }),
      ctx(),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("appointment must end after it starts");
  });

  it("rejects an inactive technician", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const technician = await makeTechnician({ isActive: false });

    const response = await create(
      request("POST", "/api/v1/appointments", {
        token,
        body: appointmentBody(
          job.id,
          technician.id,
          "2025-03-12T09:00:00Z",
          "2025-03-12T10:00:00Z",
        ),
      }),
      ctx(),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("technician is not active");
  });

  it("rejects closed jobs, naming the status", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const technician = await makeTechnician();

    for (const status of ["completed", "invoiced", "cancelled"] as const) {
      const job = await makeJob(customer.id, { status });
      const response = await create(
        request("POST", "/api/v1/appointments", {
          token,
          body: appointmentBody(
            job.id,
            technician.id,
            "2025-04-01T09:00:00Z",
            "2025-04-01T10:00:00Z",
          ),
        }),
        ctx(),
      );
      expect(response.status, status).toBe(400);
      expect((await errorOf(response)).message).toBe(
        `appointments cannot be added to a job that is ${status}`,
      );
    }
  });
});

describe("PATCH /appointments/:id", () => {
  it("never conflicts with itself on reschedule", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const technician = await makeTechnician();
    const appointment = await makeAppointment(job.id, technician.id, {
      scheduledStart: new Date("2025-03-12T09:00:00Z"),
      scheduledEnd: new Date("2025-03-12T10:00:00Z"),
    });

    const response = await update(
      request("PATCH", `/api/v1/appointments/${appointment.id}`, {
        token,
        body: { scheduled_start: "2025-03-12T09:30:00Z", scheduled_end: "2025-03-12T10:30:00Z" },
      }),
      ctx({ id: String(appointment.id) }),
    );
    expect(response.status).toBe(200);
    expect((await body(response))["scheduled_start"]).toBe("2025-03-12T09:30:00Z");
  });

  it("still conflicts with other bookings on reschedule", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const technician = await makeTechnician();
    await makeAppointment(job.id, technician.id, {
      scheduledStart: new Date("2025-03-12T09:00:00Z"),
      scheduledEnd: new Date("2025-03-12T10:00:00Z"),
    });
    const second = await makeAppointment(job.id, technician.id, {
      scheduledStart: new Date("2025-03-12T11:00:00Z"),
      scheduledEnd: new Date("2025-03-12T12:00:00Z"),
    });

    const response = await update(
      request("PATCH", `/api/v1/appointments/${second.id}`, {
        token,
        body: { scheduled_start: "2025-03-12T09:30:00Z", scheduled_end: "2025-03-12T10:30:00Z" },
      }),
      ctx({ id: String(second.id) }),
    );
    expect(response.status).toBe(409);
  });
});

describe("GET /appointments", () => {
  it("filters by technician, job and time window, ordered by start", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const otherJob = await makeJob(customer.id, { title: "Backflow test" });
    const tech1 = await makeTechnician();
    const tech2 = await makeTechnician({ name: "Sam Ortiz" });
    await makeAppointment(job.id, tech1.id, {
      scheduledStart: new Date("2025-03-14T09:00:00Z"),
      scheduledEnd: new Date("2025-03-14T10:00:00Z"),
    });
    await makeAppointment(otherJob.id, tech2.id, {
      scheduledStart: new Date("2025-03-10T09:00:00Z"),
      scheduledEnd: new Date("2025-03-10T10:00:00Z"),
    });

    const all = await body(await list(request("GET", "/api/v1/appointments", { token }), ctx()));
    const starts = (all["items"] as Array<Record<string, unknown>>).map(
      (item) => item["scheduled_start"],
    );
    expect(starts).toEqual(["2025-03-10T09:00:00Z", "2025-03-14T09:00:00Z"]);

    const byTech = await body(
      await list(request("GET", `/api/v1/appointments?technician_id=${tech1.id}`, { token }), ctx()),
    );
    expect(byTech["total"]).toBe(1);

    const byJob = await body(
      await list(request("GET", `/api/v1/appointments?job_id=${otherJob.id}`, { token }), ctx()),
    );
    expect(byJob["total"]).toBe(1);

    const windowed = await body(
      await list(
        request("GET", "/api/v1/appointments?from=2025-03-12T00:00:00Z&to=2025-03-15T00:00:00Z", {
          token,
        }),
        ctx(),
      ),
    );
    expect(windowed["total"]).toBe(1);
  });

  it("rejects an unparseable from/to", async () => {
    const { token } = await signIn();
    const response = await list(
      request("GET", "/api/v1/appointments?from=lastweek", { token }),
      ctx(),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("from must be an ISO-8601 timestamp");
  });
});

describe("DELETE /appointments/:id", () => {
  it("removes the appointment", async () => {
    const { token } = await signIn();
    const customer = await makeCustomer();
    const job = await makeJob(customer.id);
    const technician = await makeTechnician();
    const appointment = await makeAppointment(job.id, technician.id);

    const response = await destroy(
      request("DELETE", `/api/v1/appointments/${appointment.id}`, { token }),
      ctx({ id: String(appointment.id) }),
    );
    expect(response.status).toBe(204);
  });
});
