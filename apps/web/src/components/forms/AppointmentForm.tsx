"use client";

import { useActionState } from "react";

import type { Appointment, Technician } from "@acme/db";

import type { ActionState } from "@/lib/forms";
import { toInputValue } from "@/lib/format";

interface AppointmentFormProps {
  action: (state: ActionState | null, data: FormData) => Promise<ActionState | null>;
  technicians: Technician[];
  appointment?: Appointment;
  submitLabel?: string;
}

export function AppointmentForm({
  action,
  technicians,
  appointment,
  submitLabel = "Book appointment",
}: AppointmentFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const fields = state?.fields ?? {};
  return (
    <form className="stack" action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}
      <label>
        Technician
        <select name="technician_id" defaultValue={appointment?.technicianId ?? ""} required>
          <option value="" disabled>
            Choose a technician…
          </option>
          {technicians.map((technician) => (
            <option key={technician.id} value={technician.id}>
              {technician.name}
              {technician.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </select>
        {fields["technician_id"] && <span className="muted">{fields["technician_id"]}</span>}
      </label>
      <label>
        Starts (UTC)
        <input
          type="datetime-local"
          name="scheduled_start"
          required
          defaultValue={appointment ? toInputValue(appointment.scheduledStart) : ""}
        />
        {fields["scheduled_start"] && <span className="muted">{fields["scheduled_start"]}</span>}
      </label>
      <label>
        Ends (UTC)
        <input
          type="datetime-local"
          name="scheduled_end"
          required
          defaultValue={appointment ? toInputValue(appointment.scheduledEnd) : ""}
        />
        {fields["scheduled_end"] && <span className="muted">{fields["scheduled_end"]}</span>}
      </label>
      <label>
        Completion notes
        <textarea
          name="completion_notes"
          rows={3}
          defaultValue={appointment?.completionNotes ?? ""}
        />
        {fields["completion_notes"] && (
          <span className="muted">{fields["completion_notes"]}</span>
        )}
      </label>
      <div>
        <button type="submit" disabled={pending}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
