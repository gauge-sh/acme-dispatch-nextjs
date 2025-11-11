"use client";

import { useActionState } from "react";

import { PRIORITIES } from "@acme/core";
import type { Customer, Job } from "@acme/db";

import type { ActionState } from "@/lib/forms";

interface JobFormProps {
  action: (state: ActionState | null, data: FormData) => Promise<ActionState | null>;
  customers: Customer[];
  job?: Job;
}

export function JobForm({ action, customers, job }: JobFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const fields = state?.fields ?? {};
  return (
    <form className="stack" action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}
      <label>
        Customer
        <select name="customer_id" defaultValue={job?.customerId ?? ""} required>
          <option value="" disabled>
            Choose a customer…
          </option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        {fields["customer_id"] && <span className="muted">{fields["customer_id"]}</span>}
      </label>
      <label>
        Title
        <input name="title" defaultValue={job?.title} required maxLength={160} />
        {fields["title"] && <span className="muted">{fields["title"]}</span>}
      </label>
      <label>
        Description
        <textarea name="description" rows={5} defaultValue={job?.description ?? ""} />
        {fields["description"] && <span className="muted">{fields["description"]}</span>}
      </label>
      <label>
        Priority
        <select name="priority" defaultValue={job?.priority ?? "normal"}>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        {fields["priority"] && <span className="muted">{fields["priority"]}</span>}
      </label>
      <div>
        <button type="submit" disabled={pending}>
          {job ? "Save changes" : "Create job"}
        </button>
      </div>
    </form>
  );
}
