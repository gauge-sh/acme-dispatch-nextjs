"use client";

import { useActionState } from "react";

import type { ActionState } from "@/lib/forms";

interface ActionButtonProps {
  action: (state: ActionState | null, data: FormData) => Promise<ActionState | null>;
  label: string;
  confirmText?: string;
  className?: string;
}

export function ActionButton({ action, label, confirmText, className }: ActionButtonProps) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirmText && !window.confirm(confirmText)) event.preventDefault();
      }}
    >
      {state?.error && <p className="form-error">{state.error}</p>}
      <button className={className} type="submit" disabled={pending}>
        {label}
      </button>
    </form>
  );
}
