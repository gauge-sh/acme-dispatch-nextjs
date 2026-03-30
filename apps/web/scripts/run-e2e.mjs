// Browser smoke tests are optional: CI and fresh checkouts have no Chromium,
// and installing one should never be a requirement for `pnpm test`.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

import { chromium } from "@playwright/test";

let executable;
try {
  executable = chromium.executablePath();
} catch {
  executable = undefined;
}

if (!executable || !existsSync(executable)) {
  console.log("chromium is not installed; skipping browser smoke tests");
  console.log("run `pnpm exec playwright install chromium` to enable them");
  process.exit(0);
}

const result = spawnSync("pnpm", ["exec", "playwright", "test"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
