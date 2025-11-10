"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isJobStatus, ValidationFailed } from "@acme/core";
import {
  addJobPart,
  createAppointment,
  createInvoiceForJob,
  createJob,
  deleteAppointment,
  deleteJob,
  deleteJobPart,
  transitionJob,
  updateJob,
} from "@acme/db";

import {
  type ActionState,
  actionError,
  intOrUndefined,
  text,
  textOrNull,
  utcTimestamp,
} from "@/lib/forms";
import { requireUser } from "@/lib/session";

function jobAttrs(data: FormData) {
  return {
    customer_id: intOrUndefined(data, "customer_id"),
    title: text(data, "title"),
    description: textOrNull(data, "description"),
    priority: text(data, "priority"),
  };
}

export async function createJobAction(
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  let id: number;
  try {
    const job = await createJob(jobAttrs(data));
    id = job.id;
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/jobs");
  redirect(`/jobs/${id}`);
}

export async function updateJobAction(
  id: number,
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  try {
    await updateJob(id, jobAttrs(data));
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/jobs/${id}`);
  redirect(`/jobs/${id}`);
}

export async function deleteJobAction(
  id: number,
  _prev: ActionState | null,
  _data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  try {
    await deleteJob(id);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/jobs");
  redirect("/jobs");
}

export async function transitionJobAction(
  id: number,
  status: string,
  _prev: ActionState | null,
  _data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  try {
    if (!isJobStatus(status)) throw new ValidationFailed("unknown status");
    await transitionJob(id, status);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/jobs/${id}`);
  return null;
}

export async function scheduleAppointmentAction(
  jobId: number,
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  try {
    await createAppointment({
      job_id: jobId,
      technician_id: intOrUndefined(data, "technician_id"),
      scheduled_start: utcTimestamp(data, "scheduled_start"),
      scheduled_end: utcTimestamp(data, "scheduled_end"),
      completion_notes: textOrNull(data, "completion_notes"),
    });
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/jobs/${jobId}`);
  return null;
}

export async function removeAppointmentAction(
  id: number,
  jobId: number,
  _prev: ActionState | null,
  _data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  try {
    await deleteAppointment(id);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/jobs/${jobId}`);
  return null;
}

export async function addJobPartAction(
  jobId: number,
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  try {
    await addJobPart(jobId, {
      part_id: intOrUndefined(data, "part_id"),
      quantity: intOrUndefined(data, "quantity"),
    });
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/jobs/${jobId}`);
  return null;
}

export async function removeJobPartAction(
  id: number,
  jobId: number,
  _prev: ActionState | null,
  _data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  try {
    await deleteJobPart(id);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/jobs/${jobId}`);
  return null;
}

export async function invoiceJobAction(
  jobId: number,
  _prev: ActionState | null,
  _data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  let invoiceId: number;
  try {
    const record = await createInvoiceForJob(jobId);
    invoiceId = record.id;
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/invoices/${invoiceId}`);
}
