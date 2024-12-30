import { describe, expect, it } from "vitest";

import cases from "../testdata/pricing-cases.json";
import type { Priority } from "./enums";
import { hoursBetween, isWeekendUtc } from "./scheduling";
import { priceInvoice } from "./pricing";

describe("pricing conformance fixtures", () => {
  it.each(cases.cases.map((c) => [c.id, c.name, c] as const))(
    "case %i: %s",
    (_id, _name, fixture) => {
      const labor = fixture.appointments.map((appointment, index) => ({
        appointmentId: index + 1,
        technicianName: `Tech ${index + 1}`,
        hourlyCostCents: appointment.technician_hourly_cost_cents,
        start: new Date(appointment.start),
        end: new Date(appointment.end),
      }));
      const parts = fixture.parts.map((part, index) => ({
        jobPartId: index + 1,
        sku: `SKU-${index + 1}`,
        name: `Part ${index + 1}`,
        quantity: part.quantity,
        unitPriceCents: part.unit_price_cents,
      }));

      // The fixture's derived columns must agree with our own derivations
      // before the totals mean anything.
      fixture.appointments.forEach((appointment, index) => {
        const input = labor[index]!;
        expect(hoursBetween(input.start, input.end)).toBe(appointment.hours);
        expect(isWeekendUtc(input.start)).toBe(appointment.weekend);
      });

      const invoice = priceInvoice({
        priority: fixture.priority as Priority,
        labor,
        parts,
      });

      expect(invoice.laborCents).toBe(fixture.expected.labor_cents);
      expect(invoice.partsCents).toBe(fixture.expected.parts_cents);
      expect(invoice.totalCents).toBe(fixture.expected.total_cents);
    },
  );
});
