-- CreateTable
CREATE TABLE "invoice_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "job_id" INTEGER NOT NULL,
    "labor_cents" INTEGER NOT NULL,
    "parts_cents" INTEGER NOT NULL,
    "total_cents" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "invoice_records_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoice_record_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit_cents" INTEGER NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "weekend" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "invoice_line_items_invoice_record_id_fkey" FOREIGN KEY ("invoice_record_id") REFERENCES "invoice_records" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_records_job_id_key" ON "invoice_records"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_line_items_invoice_record_id_position_key" ON "invoice_line_items"("invoice_record_id", "position");
