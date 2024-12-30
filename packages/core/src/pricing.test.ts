import { describe, expect, it } from "vitest";

import {
  type LaborInput,
  type PartInput,
  formatHours,
  laborAmountCents,
  laborLine,
  partAmountCents,
  partLine,
  priceInvoice,
} from "./pricing";

function labor(overrides: Partial<LaborInput> = {}): LaborInput {
  return {
    appointmentId: 1,
    technicianName: "Dana Reyes",
    hourlyCostCents: 8000,
    start: new Date("2025-03-12T13:00:00Z"),
    end: new Date("2025-03-12T14:30:00Z"),
    ...overrides,
  };
}

function part(overrides: Partial<PartInput> = {}): PartInput {
  return {
    jobPartId: 1,
    sku: "IGN-4420",
    name: "Hot surface igniter",
    quantity: 3,
    unitPriceCents: 1299,
    ...overrides,
  };
}

describe("laborAmountCents", () => {
  it("marks hours up by 1.6", () => {
    expect(laborAmountCents(labor())).toBe(19200); // 1.5h * 8000 * 1.6
  });

  it("rounds a .4 fraction down", () => {
    // 0.5h * 3333 * 1.6 = 2666.4
    expect(
      laborAmountCents(
        labor({
          hourlyCostCents: 3333,
          start: new Date("2025-03-12T08:00:00Z"),
          end: new Date("2025-03-12T08:30:00Z"),
        }),
      ),
    ).toBe(2666);
  });

  it("does not lose sub-hour precision to floats", () => {
    // 20 minutes bills exactly a third of an hour: 7999.99... would betray
    // float math; the exact answer is 8000/3 * 1.6 = 4266.66 -> 4267.
    expect(
      laborAmountCents(
        labor({
          start: new Date("2025-03-12T13:00:00Z"),
          end: new Date("2025-03-12T13:20:00Z"),
        }),
      ),
    ).toBe(4267);
  });

  it("applies the weekend surcharge to the already-rounded line", () => {
    // 1.25h * 2305 * 1.6 = 4610 exactly; 4610 * 1.15 = 5301.5 -> 5302.
    expect(
      laborAmountCents(
        labor({
          hourlyCostCents: 2305,
          start: new Date("2025-03-15T09:00:00Z"), // Saturday
          end: new Date("2025-03-15T10:15:00Z"),
        }),
      ),
    ).toBe(5302);
  });

  it("charges no surcharge for a weekday start", () => {
    expect(
      laborAmountCents(
        labor({
          hourlyCostCents: 5000,
          start: new Date("2025-03-12T09:00:00Z"),
          end: new Date("2025-03-12T11:00:00Z"),
        }),
      ),
    ).toBe(16000);
  });
});

describe("partAmountCents", () => {
  it("multiplies quantity by the captured unit price", () => {
    expect(partAmountCents(part())).toBe(3897);
    expect(partAmountCents(part({ quantity: 1, unitPriceCents: 5 }))).toBe(5);
  });
});

describe("formatHours", () => {
  const HOUR = 3_600_000;

  it("drops trailing zeros and the trailing point", () => {
    expect(formatHours(2 * HOUR)).toBe("2");
    expect(formatHours(1.5 * HOUR)).toBe("1.5");
    expect(formatHours(0.25 * HOUR)).toBe("0.25");
    expect(formatHours(0.3 * HOUR)).toBe("0.3");
  });

  it("quantizes to two decimals, halves away from zero", () => {
    expect(formatHours(20 * 60_000)).toBe("0.33"); // a third of an hour
    expect(formatHours(2.005 * HOUR)).toBe("2.01");
    expect(formatHours(0.334 * HOUR)).toBe("0.33");
  });

  it("never uses exponent notation for tiny durations", () => {
    expect(formatHours(36_000)).toBe("0.01");
    expect(formatHours(3_600)).toBe("0");
  });
});

describe("laborLine", () => {
  it("renders the description from the exact duration", () => {
    const line = laborLine(labor());
    expect(line.description).toBe("Dana Reyes — 1.5h on 2025-03-12");
    expect(line.quantity).toBe(1.5);
    expect(line.unitCents).toBe(8000);
    expect(line.amountCents).toBe(19200);
    expect(line.weekend).toBe(false);
  });

  it("flags weekend starts", () => {
    const line = laborLine(
      labor({
        start: new Date("2025-03-16T09:00:00Z"),
        end: new Date("2025-03-16T10:00:00Z"),
      }),
    );
    expect(line.weekend).toBe(true);
  });
});

describe("partLine", () => {
  it("labels the part by sku and name", () => {
    const line = partLine(part());
    expect(line.description).toBe("IGN-4420 — Hot surface igniter");
    expect(line.quantity).toBe(3);
    expect(line.weekend).toBe(false);
  });
});

describe("priceInvoice", () => {
  it("orders labor by start then id, parts by job part id", () => {
    const invoice = priceInvoice({
      priority: "normal",
      labor: [
        labor({
          appointmentId: 9,
          start: new Date("2025-03-13T09:00:00Z"),
          end: new Date("2025-03-13T10:00:00Z"),
        }),
        labor({
          appointmentId: 7,
          start: new Date("2025-03-12T09:00:00Z"),
          end: new Date("2025-03-12T10:00:00Z"),
        }),
        labor({
          appointmentId: 3,
          start: new Date("2025-03-12T09:00:00Z"),
          end: new Date("2025-03-12T10:00:00Z"),
        }),
      ],
      parts: [part({ jobPartId: 5 }), part({ jobPartId: 2 })],
    });
    expect(
      invoice.lineItems.map((line) => line.kind),
    ).toEqual(["labor", "labor", "labor", "part", "part"]);
    // Ties on start break by appointment id.
    expect(invoice.lineItems[0]?.description).toContain("2025-03-12");
    expect(invoice.lineItems[1]?.description).toContain("2025-03-12");
    expect(invoice.lineItems[2]?.description).toContain("2025-03-13");
  });

  it("sums labor and parts into the total", () => {
    const invoice = priceInvoice({
      priority: "normal",
      labor: [labor()],
      parts: [part()],
    });
    expect(invoice.laborCents).toBe(19200);
    expect(invoice.partsCents).toBe(3897);
    expect(invoice.totalCents).toBe(23097);
  });

  it("applies the urgent multiplier to the total only", () => {
    const invoice = priceInvoice({
      priority: "urgent",
      labor: [labor()],
      parts: [part()],
    });
    expect(invoice.totalCents).toBe(25407); // 23097 * 1.1 = 25406.7
    expect(invoice.lineItems.map((line) => line.amountCents)).toEqual([19200, 3897]);
  });

  it("rounds an urgent half-cent away from zero", () => {
    // labor 4610 + a 5-cent part = 4615; 4615 * 1.1 = 5076.5 -> 5077.
    const invoice = priceInvoice({
      priority: "urgent",
      labor: [
        labor({
          hourlyCostCents: 2305,
          start: new Date("2025-03-12T09:00:00Z"),
          end: new Date("2025-03-12T10:15:00Z"),
        }),
      ],
      parts: [part({ quantity: 1, unitPriceCents: 5 })],
    });
    expect(invoice.totalCents).toBe(5077);
  });

  it("applies no multiplier for low or normal priority", () => {
    for (const priority of ["low", "normal"] as const) {
      const invoice = priceInvoice({ priority, labor: [labor()], parts: [] });
      expect(invoice.totalCents).toBe(invoice.laborCents);
    }
  });

  it("prices an empty job at zero", () => {
    const invoice = priceInvoice({ priority: "urgent", labor: [], parts: [] });
    expect(invoice).toEqual({
      laborCents: 0,
      partsCents: 0,
      totalCents: 0,
      lineItems: [],
    });
  });
});
