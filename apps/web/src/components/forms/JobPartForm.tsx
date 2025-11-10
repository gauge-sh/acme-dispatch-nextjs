"use client";

import { useActionState } from "react";

import type { Part, StockLevel } from "@acme/db";

import type { ActionState } from "@/lib/forms";

interface JobPartFormProps {
  action: (state: ActionState | null, data: FormData) => Promise<ActionState | null>;
  parts: Array<Part & { stockLevel: StockLevel | null }>;
}

export function JobPartForm({ action, parts }: JobPartFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const fields = state?.fields ?? {};
  return (
    <form className="inline-form" action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}
      <label>
        Part
        <select name="part_id" defaultValue="" required>
          <option value="" disabled>
            Choose a part…
          </option>
          {parts.map((part) => (
            <option key={part.id} value={part.id}>
              {part.sku} — {part.name} ({part.stockLevel?.quantityOnHand ?? 0} on hand)
            </option>
          ))}
        </select>
        {fields["part_id"] && <span className="muted">{fields["part_id"]}</span>}
      </label>
      <label>
        Quantity
        <input name="quantity" type="number" min="1" defaultValue="1" required />
        {fields["quantity"] && <span className="muted">{fields["quantity"]}</span>}
      </label>
      <button type="submit" disabled={pending}>
        Record usage
      </button>
    </form>
  );
}
