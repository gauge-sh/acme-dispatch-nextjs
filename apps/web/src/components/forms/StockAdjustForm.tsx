"use client";

import { useActionState } from "react";

import type { ActionState } from "@/lib/forms";

interface StockAdjustFormProps {
  action: (state: ActionState | null, data: FormData) => Promise<ActionState | null>;
}

export function StockAdjustForm({ action }: StockAdjustFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form className="inline-form" action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}
      <label>
        Adjust by (use a negative number to remove stock)
        <input name="delta" type="number" required placeholder="+10 or -3" />
      </label>
      <button type="submit" disabled={pending}>
        Apply
      </button>
    </form>
  );
}
