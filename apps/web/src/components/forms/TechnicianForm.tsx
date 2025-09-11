"use client";

import { useActionState } from "react";

import type { Technician } from "@acme/db";

import type { ActionState } from "@/lib/forms";

interface TechnicianFormProps {
  action: (state: ActionState | null, data: FormData) => Promise<ActionState | null>;
  technician?: Technician;
  skillTags?: string[];
}

export function TechnicianForm({ action, technician, skillTags }: TechnicianFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const fields = state?.fields ?? {};
  return (
    <form className="stack" action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}
      <label>
        Name
        <input name="name" defaultValue={technician?.name} required maxLength={120} />
        {fields["name"] && <span className="muted">{fields["name"]}</span>}
      </label>
      <label>
        Phone
        <input name="phone" defaultValue={technician?.phone ?? ""} />
        {fields["phone"] && <span className="muted">{fields["phone"]}</span>}
      </label>
      <label>
        Skill tags (comma separated)
        <input
          name="skill_tags"
          defaultValue={(skillTags ?? []).join(", ")}
          placeholder="hvac, plumbing"
        />
        {fields["skill_tags"] && <span className="muted">{fields["skill_tags"]}</span>}
      </label>
      <label>
        Hourly cost (dollars)
        <input
          name="hourly_cost"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={technician ? (technician.hourlyCostCents / 100).toFixed(2) : ""}
        />
        {fields["hourly_cost_cents"] && (
          <span className="muted">{fields["hourly_cost_cents"]}</span>
        )}
      </label>
      <label>
        <span>
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={technician?.isActive ?? true}
          />{" "}
          Active — can take new appointments
        </span>
      </label>
      <div>
        <button type="submit" disabled={pending}>
          {technician ? "Save changes" : "Add technician"}
        </button>
      </div>
    </form>
  );
}
