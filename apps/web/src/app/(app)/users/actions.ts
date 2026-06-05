"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createUser, deleteUser, issueToken, revokeToken, updateUser } from "@acme/db";

import { type ActionState, actionError, text } from "@/lib/forms";
import { requireAdmin } from "@/lib/session";

// Role and status are dropdowns that self-edits omit entirely, so their
// absence means "leave alone", never "clear". An empty password field means
// "no change" on edit; core treats an absent key the same way.
function userAttrs(data: FormData) {
  const attrs: Record<string, unknown> = {
    email: text(data, "email"),
    name: text(data, "name"),
  };
  const role = data.get("role");
  if (typeof role === "string") attrs["role"] = role;
  const isActive = data.get("is_active");
  if (typeof isActive === "string") attrs["is_active"] = isActive === "true";
  const password = text(data, "password");
  if (password !== "") attrs["password"] = password;
  return attrs;
}

export async function createUserAction(
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireAdmin();
  // The web admin screen always sets a password on create, even though the
  // wire contract leaves it optional — an account nobody can sign into is
  // never useful from this screen.
  if (text(data, "password") === "") {
    return { error: "password is required", fields: { password: "password is required" } };
  }
  let id: number;
  try {
    const user = await createUser(userAttrs(data));
    id = user.id;
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/users");
  redirect(`/users/${id}`);
}

export async function updateUserAction(
  id: number,
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  const actor = await requireAdmin();
  try {
    await updateUser(id, userAttrs(data), actor.id);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/users/${id}`);
  redirect(`/users/${id}`);
}

export async function deleteUserAction(
  id: number,
  _prev: ActionState | null,
  _data: FormData,
): Promise<ActionState | null> {
  const actor = await requireAdmin();
  // The API allows this (unless you are the last active admin); the web UI
  // refuses it outright, both by hiding the button and by rejecting it here.
  if (actor.id === id) {
    return {
      error: "you cannot delete your own account",
      fields: {},
    };
  }
  try {
    await deleteUser(id);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath("/users");
  redirect("/users");
}

export interface TokenIssueState {
  error?: string;
  plaintext?: string;
  tokenName?: string;
}

export async function issueTokenAction(
  userId: number,
  _prev: TokenIssueState | null,
  data: FormData,
): Promise<TokenIssueState> {
  await requireAdmin();
  try {
    const { plaintext, token } = await issueToken(userId, { name: text(data, "name") });
    revalidatePath(`/users/${userId}`);
    return { plaintext, tokenName: token.name };
  } catch (error) {
    const state = actionError(error);
    return { error: state.error };
  }
}

export async function revokeTokenAction(
  id: number,
  userId: number,
  _prev: ActionState | null,
  _data: FormData,
): Promise<ActionState | null> {
  await requireAdmin();
  try {
    await revokeToken(id);
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/users/${userId}`);
  return null;
}
