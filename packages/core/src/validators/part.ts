import { ValidationFailed } from "../errors";
import { type Attrs, FieldErrors, readInt, readString } from "../validate";

export interface PartAttrs {
  sku: string;
  name: string;
  unitCostCents: number;
  unitPriceCents: number;
}

const SKU_PATTERN = /^[A-Z0-9-]{1,40}$/;

function readSku(input: Attrs, errors: FieldErrors): string | undefined {
  const sku = readString(input, "sku", { max: 40 }, errors);
  if (typeof sku !== "string") return undefined;
  if (!SKU_PATTERN.test(sku)) {
    errors.add("sku", "sku must be upper-case letters, digits, and dashes");
    return undefined;
  }
  return sku;
}

/** Enforced on create and update, against the merged values. */
export function checkPartPricing(unitCostCents: number, unitPriceCents: number): void {
  if (unitPriceCents < unitCostCents) {
    throw new ValidationFailed("unit price cannot be below unit cost", {
      unit_price_cents: "unit price cannot be below unit cost",
    });
  }
}

export function parsePartCreate(input: Attrs): PartAttrs {
  const errors = new FieldErrors();
  if (!("sku" in input)) errors.add("sku", "sku is required");
  const sku = readSku(input, errors);
  const name = readString(input, "name", { max: 160, required: true }, errors);
  const unitCostCents = readInt(input, "unit_cost_cents", { required: true }, errors);
  const unitPriceCents = readInt(input, "unit_price_cents", { required: true }, errors);
  errors.throwIfAny();
  checkPartPricing(unitCostCents as number, unitPriceCents as number);
  return {
    sku: sku as string,
    name: name as string,
    unitCostCents: unitCostCents as number,
    unitPriceCents: unitPriceCents as number,
  };
}

export function parsePartUpdate(input: Attrs): Partial<PartAttrs> {
  const errors = new FieldErrors();
  const sku = readSku(input, errors);
  const name = readString(input, "name", { max: 160 }, errors);
  const unitCostCents = readInt(input, "unit_cost_cents", {}, errors);
  const unitPriceCents = readInt(input, "unit_price_cents", {}, errors);
  errors.throwIfAny();

  const patch: Partial<PartAttrs> = {};
  if (sku !== undefined) patch.sku = sku;
  if (typeof name === "string") patch.name = name;
  if (unitCostCents !== undefined) patch.unitCostCents = unitCostCents;
  if (unitPriceCents !== undefined) patch.unitPriceCents = unitPriceCents;
  return patch;
}
