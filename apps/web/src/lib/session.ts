import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { prisma, type User } from "@acme/db";

import { authOptions } from "./auth";

/** The signed-in user, re-read from the database so deactivation and role
 * changes take effect immediately rather than at next sign-in. */
export async function currentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id: Number(id) } });
  return user?.isActive ? user : null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
