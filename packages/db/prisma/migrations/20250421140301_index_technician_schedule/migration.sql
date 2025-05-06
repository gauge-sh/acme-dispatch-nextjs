-- DropIndex
DROP INDEX "appointments_technician_id_idx";

-- CreateIndex
CREATE INDEX "appointments_technician_id_scheduled_start_idx" ON "appointments"("technician_id", "scheduled_start");
