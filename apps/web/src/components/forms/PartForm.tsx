"use client";

import { useActionState } from "react";

import type { Part } from "@acme/db";

import type { ActionState } from "@/lib/forms";

interface PartFormProps {
  action: (state: ActionState | null, data: FormData) => Promise<ActionState | null>;
  part?: Part;
}

export function PartForm({ action, part }: PartFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const fields = state?.fields ?? {};
  return (
    <form className="stack" action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}
      <label>
        SKU
        <input
          name="sku"
          defaultValue={part?.sku}
          required
          maxLength={40}
          placeholder="IGN-4420"
          style={{ textTransform: "uppercase" }}
        />
        {fields["sku"] && <span className="muted">{fields["sku"]}</span>}
      </label>
      <label>
        Name
        <input name="name" defaultValue={part?.name} required maxLength={160} />
        {fields["name"] && <span className="muted">{fields["name"]}</span>}
      </label>
      <label>
        Unit cost (dollars)
        <input
          name="unit_cost"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={part ? (part.unitCostCents / 100).toFixed(2) : ""}
        />
        {fields["unit_cost_cents"] && <span className="muted">{fields["unit_cost_cents"]}</span>}
      </label>
      <label>
        Unit price (dollars)
        <input
          name="unit_price"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={part ? (part.unitPriceCents / 100).toFixed(2) : ""}
        />
        {fields["unit_price_cents"] && (
          <span className="muted">{fields["unit_price_cents"]}</span>
        )}
      </label>
      <div>
        <button type="submit" disabled={pending}>
          {part ? "Save changes" : "Add part"}
        </button>
      </div>
    </form>
  );
}
