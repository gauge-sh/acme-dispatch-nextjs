"use client";

import { useActionState } from "react";

import type { ActionState } from "@/lib/forms";

interface DeleteFormProps {
  action: (state: ActionState | null, data: FormData) => Promise<ActionState | null>;
  label?: string;
  confirmText: string;
}

export function DeleteForm({ action, label = "Delete", confirmText }: DeleteFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      {state?.error && <p className="form-error">{state.error}</p>}
      <button className="danger" type="submit" disabled={pending}>
        {label}
      </button>
    </form>
  );
}
