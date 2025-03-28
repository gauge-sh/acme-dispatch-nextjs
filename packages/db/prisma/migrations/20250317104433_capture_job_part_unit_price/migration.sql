-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_job_parts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "job_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "job_parts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "job_parts_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Backfill existing rows from the part's current price; from here on the
-- price is captured at the time of use.
INSERT INTO "new_job_parts" ("created_at", "id", "job_id", "part_id", "quantity", "unit_price_cents", "updated_at")
SELECT jp."created_at", jp."id", jp."job_id", jp."part_id", jp."quantity", p."unit_price_cents", jp."updated_at"
FROM "job_parts" jp
JOIN "parts" p ON p."id" = jp."part_id";
DROP TABLE "job_parts";
ALTER TABLE "new_job_parts" RENAME TO "job_parts";
CREATE INDEX "job_parts_job_id_idx" ON "job_parts"("job_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
