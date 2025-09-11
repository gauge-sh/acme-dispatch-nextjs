"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createTechnician, deleteTechnician, updateTechnician } from "@acme/db";

import {
  type ActionState,
  actionError,
  checkbox,
  dollarsToCents,
  tagList,
  text,
  textOrNull,
} from "@/lib/forms";
import { requireAdmin, requireUser } from "@/lib/session";

function technicianAttrs(data: FormData) {
  return {
    name: text(data, "name"),
    phone: textOrNull(data, "phone"),
    skill_tags: tagList(data, "skill_tags"),
    hourly_cost_cents: dollarsToCents(data, "hourly_cost"),
    is_active: checkbox(data, "is_active"),
  };
}

export async function createTechnicianAction(
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  let id: number;
  try {
    const technician = await createTechnician(technicianAttrs(data));
    id = technician.id;
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/technicians");
  redirect(`/technicians/${id}`);
}

export async function updateTechnicianAction(
  id: number,
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  try {
    await updateTechnician(id, technicianAttrs(data));
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/technicians/${id}`);
  redirect(`/technicians/${id}`);
}

export async function deleteTechnicianAction(
  id: number,
  _prev: ActionState | null,
  _data: FormData,
): Promise<ActionState | null> {
  // Mirrors the API: removing a technician is an admin call.
  await requireAdmin();
  try {
    await deleteTechnician(id);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/technicians");
  redirect("/technicians");
}
