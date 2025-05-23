import { mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@acme/db";

const here = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(here, ".dbs");
const migrationsDir = path.resolve(here, "../../../packages/db/prisma/migrations");

function statements(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((chunk) => chunk.trim())
    .filter((chunk) =>
      chunk
        .split("\n")
        .some((line) => line.trim().length > 0 && !line.trim().startsWith("--")),
    );
}

/**
 * Builds one migrated template database; each worker copies it instead of
 * re-running migrations, which keeps the suite fast and network-free.
 */
export default async function setup(): Promise<void> {
  rmSync(dbDir, { recursive: true, force: true });
  mkdirSync(dbDir, { recursive: true });
  const template = path.join(dbDir, "template.db");
  const prisma = new PrismaClient({ datasourceUrl: `file:${template}` });
  try {
    const folders = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const folder of folders) {
      const sql = readFileSync(path.join(migrationsDir, folder, "migration.sql"), "utf8");
      for (const statement of statements(sql)) {
        await prisma.$executeRawUnsafe(statement);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}
