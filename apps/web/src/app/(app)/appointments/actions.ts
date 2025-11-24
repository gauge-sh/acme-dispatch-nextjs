"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateAppointment } from "@acme/db";

import {
  type ActionState,
  actionError,
  intOrUndefined,
  textOrNull,
  utcTimestamp,
} from "@/lib/forms";
import { requireUser } from "@/lib/session";

export async function rescheduleAppointmentAction(
  id: number,
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  let jobId: number;
  try {
    const appointment = await updateAppointment(id, {
      technician_id: intOrUndefined(data, "technician_id"),
      scheduled_start: utcTimestamp(data, "scheduled_start"),
      scheduled_end: utcTimestamp(data, "scheduled_end"),
      completion_notes: textOrNull(data, "completion_notes"),
    });
    jobId = appointment.jobId;
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}`);
}
