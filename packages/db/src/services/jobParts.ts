import {
  type Attrs,
  FieldErrors,
  type JobStatus,
  NotFound,
  ValidationFailed,
  checkAcceptsParts,
  consumeStock,
  readInt,
  releaseStock,
} from "@acme/core";
import type { JobPart } from "@prisma/client";

import { prisma } from "../client";

function parseJobPartCreate(input: Attrs): { partId: number; quantity: number } {
  const errors = new FieldErrors();
  const partId = readInt(input, "part_id", { required: true }, errors);

  let quantity: number | undefined;
  const raw = input["quantity"];
  if (raw === undefined) {
    errors.add("quantity", "quantity is required");
  } else if (typeof raw !== "number" || !Number.isInteger(raw)) {
    errors.add("quantity", "quantity must be an integer");
  } else if (raw < 1) {
    errors.add("quantity", "quantity must be greater than zero");
  } else {
    quantity = raw;
  }

  errors.throwIfAny();
  return { partId: partId as number, quantity: quantity as number };
}

export async function addJobPart(jobId: number, input: Attrs): Promise<JobPart> {
  const { partId, quantity } = parseJobPartCreate(input);
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFound("job not found");
    checkAcceptsParts(job.status as JobStatus);

    const part = await tx.part.findUnique({
      where: { id: partId },
      include: { stockLevel: true },
    });
    if (!part) {
      throw new ValidationFailed("part not found", { part_id: "part not found" });
    }
    const onHand = part.stockLevel?.quantityOnHand ?? 0;
    await tx.stockLevel.update({
      where: { partId },
      data: { quantityOnHand: consumeStock(onHand, quantity) },
    });
    return tx.jobPart.create({
      data: { jobId, partId, quantity, unitPriceCents: part.unitPriceCents },
    });
  });
}

export async function deleteJobPart(id: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const jobPart = await tx.jobPart.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!jobPart) throw new NotFound("job part not found");
    if (jobPart.job.status === "invoiced") {
      throw new ValidationFailed("an invoiced job cannot be changed");
    }
    const stock = await tx.stockLevel.findUnique({ where: { partId: jobPart.partId } });
    if (stock) {
      await tx.stockLevel.update({
        where: { partId: jobPart.partId },
        data: { quantityOnHand: releaseStock(stock.quantityOnHand, jobPart.quantity) },
      });
    }
    await tx.jobPart.delete({ where: { id } });
  });
}
