import { describe, expect, it } from "vitest";

import { JOB_STATUSES } from "./enums";
import { InvalidTransition, ValidationFailed } from "./errors";
import { checkInvoiceable, draftInvoice } from "./invoicing";

describe("checkInvoiceable", () => {
  it("allows only a completed job", () => {
    expect(() =>
      checkInvoiceable("completed", { alreadyInvoiced: false }),
    ).not.toThrow();
  });

  it("rejects every other status as an invalid transition", () => {
    for (const status of JOB_STATUSES) {
      if (status === "completed") continue;
      expect(() => checkInvoiceable(status, { alreadyInvoiced: false })).toThrow(
        new InvalidTransition("only a completed job can be invoiced"),
      );
    }
  });

  it("reports a duplicate before it reports the status", () => {
    // An invoiced job breaks both rules; the duplicate check must win so the
    // caller sees validation_failed, not invalid_transition.
    expect(() => checkInvoiceable("invoiced", { alreadyInvoiced: true })).toThrow(
      new ValidationFailed("job is already invoiced"),
    );
    expect(() => checkInvoiceable("completed", { alreadyInvoiced: true })).toThrow(
      ValidationFailed,
    );
  });
});

describe("draftInvoice", () => {
  it("prices the job when it is invoiceable", () => {
    const invoice = draftInvoice({
      status: "completed",
      priority: "normal",
      labor: [
        {
          appointmentId: 1,
          technicianName: "Sam Ortiz",
          hourlyCostCents: 5000,
          start: new Date("2025-03-12T09:00:00Z"),
          end: new Date("2025-03-12T11:00:00Z"),
        },
      ],
      parts: [],
      alreadyInvoiced: false,
    });
    expect(invoice.totalCents).toBe(16000);
    expect(invoice.lineItems).toHaveLength(1);
  });

  it("refuses to price a job that is not completed", () => {
    expect(() =>
      draftInvoice({
        status: "in_progress",
        priority: "normal",
        labor: [],
        parts: [],
        alreadyInvoiced: false,
      }),
    ).toThrow(InvalidTransition);
  });
});
