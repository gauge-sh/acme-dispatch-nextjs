-- CreateTable
CREATE TABLE "parts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit_cost_cents" INTEGER NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "stock_levels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "part_id" INTEGER NOT NULL,
    "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "stock_levels_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "parts_sku_key" ON "parts"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_part_id_key" ON "stock_levels"("part_id");
