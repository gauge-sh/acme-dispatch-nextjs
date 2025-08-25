import {
  type Attrs,
  NotFound,
  ValidationFailed,
  parseUserCreate,
  parseUserUpdate,
  type Role,
} from "@acme/core";
import type { Prisma, User } from "@prisma/client";

import { prisma } from "../client";
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

/** `passwordHash` comes from the web app only; the API never sets one. */
export async function createUser(
  input: Attrs,
  options: { passwordHash?: string } = {},
): Promise<User> {
  const attrs = parseUserCreate(input);
  await checkEmailFree(attrs.email);
  return prisma.user.create({
    data: { ...attrs, passwordHash: options.passwordHash ?? null },
  });
}

export async function setUserPassword(id: number, passwordHash: string): Promise<void> {
  await getUser(id);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
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
  const patch = parseUserUpdate(input);

  if (patch.email !== undefined) await checkEmailFree(patch.email, id);
  if (id === actorId) {
    if (patch.role !== undefined && patch.role !== user.role) {
      throw new ValidationFailed("cannot change your own role", {
        role: "cannot change your own role",
      });
    }
    if (patch.isActive === false && user.isActive) {
      throw new ValidationFailed("cannot deactivate your own account", {
        is_active: "cannot deactivate your own account",
      });
    }
  }
  const demoted = patch.role !== undefined && patch.role !== "admin";
  const deactivated = patch.isActive === false;
  if ((demoted || deactivated) && (await isLastActiveAdmin(user))) {
    throw new ValidationFailed("cannot remove the last active admin");
  }
  return prisma.user.update({ where: { id }, data: patch });
}

export async function deleteUser(id: number): Promise<void> {
  const user = await getUser(id);
  if (await isLastActiveAdmin(user)) {
    throw new ValidationFailed("cannot remove the last active admin");
  }
  await prisma.user.delete({ where: { id } });
}
