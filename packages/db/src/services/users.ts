import {
  type Attrs,
  NotFound,
  ValidationFailed,
  parseUserCreate,
  parseUserUpdate,
  type Role,
} from "@acme/core";
import { hash } from "bcryptjs";
import type { Prisma, User } from "@prisma/client";

import { prisma } from "../client";

const BCRYPT_COST = 10;
import { type Page, type PageParams, pageSlice } from "../pagination";

export interface UserFilters {
  role?: Role;
  isActive?: boolean;
}

export async function listUsers(
  filters: UserFilters,
  page: PageParams,
): Promise<Page<User>> {
  const where: Prisma.UserWhereInput = {};
  if (filters.role !== undefined) where.role = filters.role;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { id: "asc" }, ...pageSlice(page) }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page: page.page, perPage: page.perPage };
}

export async function getUser(id: number): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFound("user not found");
  return user;
}

async function checkEmailFree(email: string, exceptId?: number): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== exceptId) {
    throw new ValidationFailed("email is already in use", {
      email: "email is already in use",
    });
  }
}

export async function createUser(input: Attrs): Promise<User> {
  const { password, ...attrs } = parseUserCreate(input);
  await checkEmailFree(attrs.email);
  return prisma.user.create({
    data: {
      ...attrs,
      // Without a password the account cannot sign in until an admin sets one.
      passwordHash: password === undefined ? null : await hash(password, BCRYPT_COST),
    },
  });
}

async function isLastActiveAdmin(user: User): Promise<boolean> {
  if (user.role !== "admin" || !user.isActive) return false;
  const others = await prisma.user.count({
    where: { role: "admin", isActive: true, id: { not: user.id } },
  });
  return others === 0;
}

/** `actorId` is the authenticated user making the change. */
export async function updateUser(
  id: number,
  input: Attrs,
  actorId: number,
): Promise<User> {
  const user = await getUser(id);
  const { password, ...patch } = parseUserUpdate(input);

  if (patch.email !== undefined) await checkEmailFree(patch.email, id);
  if (id === actorId) {
    if (patch.role !== undefined && patch.role !== user.role) {
      throw new ValidationFailed("you cannot change your own role", {
        role: "you cannot change your own role",
      });
    }
    if (patch.isActive === false && user.isActive) {
      throw new ValidationFailed("you cannot deactivate yourself", {
        is_active: "you cannot deactivate yourself",
      });
    }
  }
  const demoted = patch.role !== undefined && patch.role !== "admin";
  const deactivated = patch.isActive === false;
  if ((demoted || deactivated) && (await isLastActiveAdmin(user))) {
    throw new ValidationFailed("cannot remove the last active admin");
  }
  return prisma.user.update({
    where: { id },
    data: {
      ...patch,
      ...(password !== undefined ? { passwordHash: await hash(password, BCRYPT_COST) } : {}),
    },
  });
}

export async function deleteUser(id: number): Promise<void> {
  const user = await getUser(id);
  if (await isLastActiveAdmin(user)) {
    throw new ValidationFailed("cannot remove the last active admin");
  }
  await prisma.user.delete({ where: { id } });
}
