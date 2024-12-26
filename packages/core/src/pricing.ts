import type { LineKind, Priority } from "./enums";
import { divideRounded, toSafeCents } from "./money";
import { MS_PER_HOUR, durationMs, isWeekendUtc } from "./scheduling";

// 1.6, 1.15 and 1.10 as exact ratios so every step stays in integer math.
const LABOR_MARKUP = { num: 16n, den: 10n };
const WEEKEND_MULTIPLIER = { num: 115n, den: 100n };
const URGENT_MULTIPLIER = { num: 110n, den: 100n };

export interface LaborInput {
  appointmentId: number;
  technicianName: string;
  hourlyCostCents: number;
  start: Date;
  end: Date;
}

export interface PartInput {
  jobPartId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface LineItem {
  kind: LineKind;
  description: string;
  quantity: number;
  unitCents: number;
  amountCents: number;
  weekend: boolean;
}

export interface PricedInvoice {
  laborCents: number;
  partsCents: number;
  totalCents: number;
  lineItems: LineItem[];
}

export function laborAmountCents(input: LaborInput): number {
  const ms = BigInt(durationMs(input.start, input.end));
  const base = divideRounded(
    ms * BigInt(input.hourlyCostCents) * LABOR_MARKUP.num,
    BigInt(MS_PER_HOUR) * LABOR_MARKUP.den,
  );
  if (!isWeekendUtc(input.start)) {
    return toSafeCents(base);
  }
  // The surcharge lands on the already-rounded line, not the raw product, so
  // the two roundings stay visible as two separate steps.
  return toSafeCents(divideRounded(base * WEEKEND_MULTIPLIER.num, WEEKEND_MULTIPLIER.den));
}

export function partAmountCents(input: PartInput): number {
  // Whole cents times a whole quantity: nothing to round.
  return input.quantity * input.unitPriceCents;
}

/**
 * Hours as they read on an invoice: `2`, `1.5`, `0.25`, `0.33`. Two decimals
 * is the finest granularity worth printing; the label never drives an amount,
 * which is always computed from the exact duration.
 */
export function formatHours(ms: number): string {
  const hundredths = Number(divideRounded(BigInt(ms), 36_000n));
  const whole = Math.trunc(hundredths / 100);
  const fraction = hundredths % 100;
  if (fraction === 0) return `${whole}`;
  if (fraction % 10 === 0) return `${whole}.${fraction / 10}`;
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}

export function laborLine(input: LaborInput): LineItem {
  const ms = durationMs(input.start, input.end);
  const day = input.start.toISOString().slice(0, 10);
  return {
    kind: "labor",
    description: `${input.technicianName} — ${formatHours(ms)}h on ${day}`,
    quantity: ms / MS_PER_HOUR,
    unitCents: input.hourlyCostCents,
    amountCents: laborAmountCents(input),
    weekend: isWeekendUtc(input.start),
  };
}

export function partLine(input: PartInput): LineItem {
  return {
    kind: "part",
    description: `${input.sku} — ${input.name}`,
    quantity: input.quantity,
    unitCents: input.unitPriceCents,
    amountCents: partAmountCents(input),
    weekend: false,
  };
}

export function priceInvoice(options: {
  priority: Priority;
  labor: LaborInput[];
  parts: PartInput[];
}): PricedInvoice {
  const laborLines = [...options.labor]
    .sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() || a.appointmentId - b.appointmentId,
    )
    .map(laborLine);
  const partLines = [...options.parts]
    .sort((a, b) => a.jobPartId - b.jobPartId)
    .map(partLine);

  const laborCents = laborLines.reduce((sum, line) => sum + line.amountCents, 0);
  const partsCents = partLines.reduce((sum, line) => sum + line.amountCents, 0);

  let totalCents = laborCents + partsCents;
  if (options.priority === "urgent") {
    // Applied last, to the total alone: line amounts stay as billed.
    totalCents = toSafeCents(
      divideRounded(BigInt(totalCents) * URGENT_MULTIPLIER.num, URGENT_MULTIPLIER.den),
    );
  }

  return {
    laborCents,
    partsCents,
    totalCents,
    lineItems: [...laborLines, ...partLines],
  };
}
