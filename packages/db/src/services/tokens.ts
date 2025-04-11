import { createHash, randomBytes } from "node:crypto";

import { type Attrs, NotFound, parseTokenCreate } from "@acme/core";
import type { ApiToken, User } from "@prisma/client";

import { prisma } from "../client";

export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** The plaintext is returned exactly once; only the hash is stored. */
export async function issueToken(
  userId: number,
  input: Attrs,
): Promise<{ token: ApiToken; plaintext: string }> {
  const { name } = parseTokenCreate(input);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFound("user not found");
  const plaintext = `adk_${randomBytes(24).toString("hex")}`;
  const token = await prisma.apiToken.create({
    data: { userId, name, tokenHash: hashToken(plaintext) },
  });
  return { token, plaintext };
}

export async function listTokens(userId: number): Promise<ApiToken[]> {
  return prisma.apiToken.findMany({ where: { userId }, orderBy: { id: "asc" } });
}

export async function revokeToken(id: number): Promise<void> {
  const token = await prisma.apiToken.findUnique({ where: { id } });
  if (!token) throw new NotFound("token not found");
  await prisma.apiToken.delete({ where: { id } });
}

/** Resolves a bearer token to its active owner, or null. */
export async function authenticateToken(plaintext: string): Promise<User | null> {
  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(plaintext) },
    include: { user: true },
  });
  if (!token || !token.user.isActive) return null;
  await prisma.apiToken.update({
    where: { id: token.id },
    data: { lastUsedAt: new Date() },
  });
  return token.user;
}
