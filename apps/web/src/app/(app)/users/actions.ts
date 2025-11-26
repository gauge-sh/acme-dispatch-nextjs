"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createUser,
  deleteUser,
  issueToken,
  revokeToken,
  setUserPassword,
  updateUser,
} from "@acme/db";

import { type ActionState, actionError, text, textOrNull } from "@/lib/forms";
import { requireAdmin } from "@/lib/session";

// Role and status are dropdowns that self-edits omit entirely, so their
// absence means "leave alone", never "clear".
function userAttrs(data: FormData) {
  const attrs: Record<string, unknown> = {
    email: text(data, "email"),
    name: text(data, "name"),
  };
  const role = data.get("role");
  if (typeof role === "string") attrs["role"] = role;
  const isActive = data.get("is_active");
  if (typeof isActive === "string") attrs["is_active"] = isActive === "true";
  return attrs;
}

export async function createUserAction(
  _prev: ActionState | null,
  data: FormData,
): Promise<ActionState | null> {
  await requireAdmin();
  const password = text(data, "password");
  if (password.length < 8) {
    return {
      error: "password must be at least 8 characters",
      fields: { password: "password must be at least 8 characters" },
    };
  }
  let id: number;
  try {
    const user = await createUser(userAttrs(data), {
      passwordHash: await hash(password, 10),
    });
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
  const password = textOrNull(data, "password");
  if (password !== null && password.length < 8) {
    return {
      error: "password must be at least 8 characters",
      fields: { password: "password must be at least 8 characters" },
    };
  }
  try {
    await updateUser(id, userAttrs(data), actor.id);
    if (password !== null) {
      await setUserPassword(id, await hash(password, 10));
    }
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
  await requireAdmin();
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
