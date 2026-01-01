-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "part_id" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "quantity_after" INTEGER NOT NULL,
    "note" TEXT,
    "user_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_adjustments_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_adjustments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "stock_adjustments_part_id_idx" ON "stock_adjustments"("part_id");
