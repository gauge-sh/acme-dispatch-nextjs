"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adjustStockLevel, createPart, deletePart, updatePart } from "@acme/db";

import {
  type ActionState,
  actionError,
  dollarsToCents,
  intOrUndefined,
  text,
} from "@/lib/forms";
import { requireAdmin, requireUser } from "@/lib/session";

function partAttrs(data: FormData) {
  return {
    sku: text(data, "sku"),
    name: text(data, "name"),
    unit_cost_cents: dollarsToCents(data, "unit_cost"),
    unit_price_cents: dollarsToCents(data, "unit_price"),
  };
}

export async function createPartAction(
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  let id: number;
  try {
    const part = await createPart(partAttrs(data));
    id = part.id;
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/parts");
  redirect(`/parts/${id}`);
}

export async function updatePartAction(
  id: number,
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  try {
    await updatePart(id, partAttrs(data));
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/parts/${id}`);
  redirect(`/parts/${id}`);
}

export async function deletePartAction(
  id: number,
  _prev: ActionState | null,
  _data: FormData,
): Promise<ActionState | null> {
  await requireAdmin();
  try {
    await deletePart(id);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/parts");
  redirect("/parts");
}

export async function adjustStockAction(
  partId: number,
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  const delta = intOrUndefined(data, "delta");
  if (delta === undefined) {
    return { error: "delta must be an integer", fields: { delta: "delta must be an integer" } };
  }
  try {
    await adjustStockLevel(partId, delta);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/parts/${partId}`);
  return null;
}
