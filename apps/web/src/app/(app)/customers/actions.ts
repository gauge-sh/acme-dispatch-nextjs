"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createCustomer, deleteCustomer, updateCustomer } from "@acme/db";

import { type ActionState, actionError, text, textOrNull } from "@/lib/forms";
import { requireUser } from "@/lib/session";

function customerAttrs(data: FormData) {
  return {
    name: text(data, "name"),
    contact_email: textOrNull(data, "contact_email"),
    phone: textOrNull(data, "phone"),
    service_address: text(data, "service_address"),
    notes: textOrNull(data, "notes"),
  };
}

export async function createCustomerAction(
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  let id: number;
  try {
    const customer = await createCustomer(customerAttrs(data));
    id = customer.id;
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

export async function updateCustomerAction(
  id: number,
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  try {
    await updateCustomer(id, customerAttrs(data));
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomerAction(
  id: number,
  _prev: ActionState | null,
  _data: FormData,
): Promise<ActionState | null> {
  await requireUser();
  try {
    await deleteCustomer(id);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/customers");
  redirect("/customers");
}
