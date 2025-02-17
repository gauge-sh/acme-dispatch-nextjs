import { PrismaClient } from "@prisma/client";

// Next.js dev reloads modules on every edit; without the global stash each
// reload would open another SQLite connection until the pool runs dry.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
