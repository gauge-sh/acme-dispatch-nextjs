import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach } from "vitest";

// The worker database must be in place before anything pulls in @acme/db,
// which opens its connection based on DATABASE_URL at import time.
const here = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(here, ".dbs");
const workerDb = path.join(dbDir, `worker-${process.env.VITEST_POOL_ID ?? "0"}.db`);
if (!existsSync(workerDb)) {
  copyFileSync(path.join(dbDir, "template.db"), workerDb);
}
process.env.DATABASE_URL = `file:${workerDb}`;

const { resetDb } = await import("./helpers");

beforeEach(async () => {
  await resetDb();
});
