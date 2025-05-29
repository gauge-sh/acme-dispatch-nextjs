import { PrismaClient } from "@prisma/client";

// Next.js dev reloads modules on every edit; without the global stash each
// reload would open another SQLite connection until the pool runs dry.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// DATABASE_URL overrides the schema's file:./dev.db, mainly so test runs can
// point at their own throwaway databases.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    process.env.DATABASE_URL
      ? { datasourceUrl: process.env.DATABASE_URL }
      : undefined,
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
