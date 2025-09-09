"use client";

import { useActionState } from "react";

import type { Customer } from "@acme/db";

import type { ActionState } from "@/lib/forms";

interface CustomerFormProps {
  action: (state: ActionState | null, data: FormData) => Promise<ActionState | null>;
  customer?: Customer;
}

export function CustomerForm({ action, customer }: CustomerFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const fields = state?.fields ?? {};
  return (
    <form className="stack" action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}
      <label>
        Name
        <input name="name" defaultValue={customer?.name} required maxLength={160} />
        {fields["name"] && <span className="muted">{fields["name"]}</span>}
      </label>
      <label>
        Contact email
        <input name="contact_email" type="email" defaultValue={customer?.contactEmail ?? ""} />
        {fields["contact_email"] && <span className="muted">{fields["contact_email"]}</span>}
      </label>
      <label>
        Phone
        <input name="phone" defaultValue={customer?.phone ?? ""} />
        {fields["phone"] && <span className="muted">{fields["phone"]}</span>}
      </label>
      <label>
        Service address
        <input
          name="service_address"
          defaultValue={customer?.serviceAddress}
          required
          maxLength={240}
        />
        {fields["service_address"] && (
          <span className="muted">{fields["service_address"]}</span>
        )}
      </label>
      <label>
        Notes
        <textarea name="notes" rows={4} defaultValue={customer?.notes ?? ""} />
        {fields["notes"] && <span className="muted">{fields["notes"]}</span>}
      </label>
      <div>
        <button type="submit" disabled={pending}>
          {customer ? "Save changes" : "Create customer"}
        </button>
      </div>
    </form>
  );
}
