import { FieldErrors, type Attrs } from "@acme/core";
import { adjustStockLevel } from "@acme/db";

import { idParam, ok, readBody, route } from "@/lib/http";
import { serializeStockLevel } from "@/lib/serialize";

function parseDelta(input: Attrs): number {
  const errors = new FieldErrors();
  // Zero is caught by the core rule with the contract's message; here we only
  // insist the value is an integer at all.
  const raw = input["delta"];
  if (raw === undefined) {
    errors.add("delta", "delta is required");
  } else if (typeof raw !== "number" || !Number.isInteger(raw)) {
    errors.add("delta", "delta must be an integer");
  }
  errors.throwIfAny();
  return raw as number;
}

export const POST = route(async (request, context) => {
  const partId = await idParam(context, "part", "partId");
  const delta = parseDelta(await readBody(request));
  const stock = await adjustStockLevel(partId, delta);
  return ok(serializeStockLevel(stock));
});
