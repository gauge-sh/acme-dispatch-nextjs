import { describe, expect, it } from "vitest";

import { ValidationFailed } from "../errors";
import { parseAppointmentCreate, parseAppointmentUpdate } from "./appointment";
import { parseCustomerCreate, parseCustomerUpdate } from "./customer";
import { parseJobCreate, parseJobUpdate } from "./job";
import { checkPartPricing, parsePartCreate, parsePartUpdate } from "./part";
import { parseTechnicianCreate, parseTechnicianUpdate } from "./technician";
import { parseTokenCreate, parseUserCreate, parseUserUpdate } from "./user";

function fieldsOf(fn: () => unknown): Record<string, string> {
  try {
    fn();
  } catch (error) {
    if (error instanceof ValidationFailed) return error.fields;
    throw error;
  }
  throw new Error("expected a ValidationFailed");
}

describe("customer", () => {
  it("accepts a full create body and trims strings", () => {
    const attrs = parseCustomerCreate({
      name: "  Harbor Light Bakery ",
      contact_email: "ops@harborlight.example",
      phone: "555-0142",
      service_address: "18 Quay St",
      notes: null,
    });
    expect(attrs).toEqual({
      name: "Harbor Light Bakery",
      contactEmail: "ops@harborlight.example",
      phone: "555-0142",
      serviceAddress: "18 Quay St",
      notes: null,
    });
  });

  it("collects every field error at once", () => {
    const fields = fieldsOf(() =>
      parseCustomerCreate({ contact_email: "not-an-email", phone: "123" }),
    );
    expect(fields).toEqual({
      name: "name is required",
      contact_email: "contact_email must contain @",
      phone: "phone must be 7-32 characters",
      service_address: "service_address is required",
    });
  });

  it("rejects an over-long name", () => {
    expect(() =>
      parseCustomerCreate({ name: "x".repeat(161), service_address: "1 Elm" }),
    ).toThrow("name must be 1-160 characters");
  });

  it("treats absent keys and explicit nulls differently on update", () => {
    expect(parseCustomerUpdate({})).toEqual({});
    expect(parseCustomerUpdate({ notes: null, phone: null })).toEqual({
      notes: null,
      phone: null,
    });
    expect(() => parseCustomerUpdate({ name: null })).toThrow("name is required");
  });
});

describe("technician", () => {
  it("normalizes skill tags to sorted lower-case without duplicates", () => {
    const attrs = parseTechnicianCreate({
      name: "Rosa Vale",
      skill_tags: ["HVAC", "plumbing", "hvac", " Electrical "],
      hourly_cost_cents: 5000,
    });
    expect(attrs.skillTags).toEqual(["electrical", "hvac", "plumbing"]);
    expect(attrs.isActive).toBe(true);
  });

  it("rejects non-string tags and over-long tags", () => {
    expect(() =>
      parseTechnicianCreate({ name: "A B", skill_tags: [1], hourly_cost_cents: 100 }),
    ).toThrow("skill_tags must be an array of strings");
    expect(() =>
      parseTechnicianCreate({
        name: "A B",
        skill_tags: ["x".repeat(41)],
        hourly_cost_cents: 100,
      }),
    ).toThrow("each skill tag must be 1-40 characters");
  });

  it("requires a positive hourly cost", () => {
    for (const bad of [0, -100, 12.5, "5000"]) {
      expect(() =>
        parseTechnicianCreate({ name: "A B", hourly_cost_cents: bad }),
      ).toThrow("hourly_cost_cents must be a positive integer");
    }
  });

  it("passes only present keys through on update", () => {
    expect(parseTechnicianUpdate({ is_active: false })).toEqual({ isActive: false });
    expect(parseTechnicianUpdate({ skill_tags: [] })).toEqual({ skillTags: [] });
  });
});

describe("job", () => {
  it("defaults priority to normal and description to null", () => {
    expect(parseJobCreate({ customer_id: 4, title: "No heat" })).toEqual({
      customerId: 4,
      title: "No heat",
      description: null,
      priority: "normal",
    });
  });

  it("rejects an unknown priority", () => {
    expect(() =>
      parseJobCreate({ customer_id: 4, title: "No heat", priority: "asap" }),
    ).toThrow("unknown priority");
  });

  it("never reads status from the body", () => {
    expect(parseJobCreate({ customer_id: 4, title: "T", status: "invoiced" })).not.toHaveProperty(
      "status",
    );
    expect(parseJobUpdate({ status: "cancelled" })).toEqual({});
  });
});

describe("appointment", () => {
  it("parses timestamps into dates", () => {
    const attrs = parseAppointmentCreate({
      job_id: 1,
      technician_id: 2,
      scheduled_start: "2025-03-12T09:00:00Z",
      scheduled_end: "2025-03-12T10:00:00Z",
    });
    expect(attrs.scheduledStart.toISOString()).toBe("2025-03-12T09:00:00.000Z");
    expect(attrs.completionNotes).toBeNull();
  });

  it("rejects garbage timestamps", () => {
    const fields = fieldsOf(() =>
      parseAppointmentCreate({
        job_id: 1,
        technician_id: 2,
        scheduled_start: "yesterday",
        scheduled_end: 12345,
      }),
    );
    expect(fields["scheduled_start"]).toBe("scheduled_start must be an ISO-8601 timestamp");
    expect(fields["scheduled_end"]).toBe("scheduled_end must be an ISO-8601 timestamp");
  });

  it("allows a partial reschedule", () => {
    const patch = parseAppointmentUpdate({ scheduled_start: "2025-03-12T11:00:00Z" });
    expect(Object.keys(patch)).toEqual(["scheduledStart"]);
  });
});

describe("part", () => {
  it("accepts a canonical sku", () => {
    const attrs = parsePartCreate({
      sku: "IGN-4420",
      name: "Hot surface igniter",
      unit_cost_cents: 900,
      unit_price_cents: 1299,
    });
    expect(attrs.sku).toBe("IGN-4420");
  });

  it("rejects a lower-case or spaced sku", () => {
    for (const sku of ["ign-4420", "IGN 4420", ""]) {
      expect(() =>
        parsePartCreate({ sku, name: "x", unit_cost_cents: 1, unit_price_cents: 1 }),
      ).toThrow(ValidationFailed);
    }
  });

  it("keeps price at or above cost on create and update", () => {
    expect(() =>
      parsePartCreate({ sku: "A-1", name: "x", unit_cost_cents: 200, unit_price_cents: 199 }),
    ).toThrow("unit price cannot be below unit cost");
    expect(() => checkPartPricing(200, 199)).toThrow("unit price cannot be below unit cost");
    expect(() => checkPartPricing(200, 200)).not.toThrow();
    expect(parsePartUpdate({ unit_price_cents: 1500 })).toEqual({ unitPriceCents: 1500 });
  });
});

describe("user", () => {
  it("lowercases the email", () => {
    const attrs = parseUserCreate({ email: "Dispatch@Acme.example", name: "Kim Salas" });
    expect(attrs.email).toBe("dispatch@acme.example");
    expect(attrs.role).toBe("dispatcher");
    expect(attrs.isActive).toBe(true);
  });

  it("requires an @ in the email", () => {
    expect(() => parseUserCreate({ email: "nope", name: "Kim" })).toThrow(
      "email must contain @",
    );
  });

  it("rejects an unknown role, accepts a known one", () => {
    expect(() => parseUserUpdate({ role: "owner" })).toThrow("unknown role");
    expect(parseUserUpdate({ role: "admin" })).toEqual({ role: "admin" });
  });

  it("validates token names", () => {
    expect(parseTokenCreate({ name: "reporting" })).toEqual({ name: "reporting" });
    expect(() => parseTokenCreate({ name: "" })).toThrow("name must be 1-80 characters");
    expect(() => parseTokenCreate({})).toThrow("name is required");
  });
});
