import type { JobStatus, Priority } from "./enums";
import { InvalidTransition, ValidationFailed } from "./errors";
import {
  type LaborInput,
  type PartInput,
  type PricedInvoice,
  priceInvoice,
} from "./pricing";

export function checkInvoiceable(
  status: JobStatus,
  options: { alreadyInvoiced: boolean },
): void {
  // A job that already has a record breaks both rules at once. The duplicate
  // check wins, so the caller hears about the record instead of the status.
  if (options.alreadyInvoiced) {
    throw new ValidationFailed("job is already invoiced");
  }
  if (status !== "completed") {
    throw new InvalidTransition("only a completed job can be invoiced");
  }
}

/**
 * Price a completed job. The caller persists the result and moves the job to
 * `invoiced` in the same transaction.
 */
export function draftInvoice(options: {
  status: JobStatus;
  priority: Priority;
  labor: LaborInput[];
  parts: PartInput[];
  alreadyInvoiced: boolean;
}): PricedInvoice {
  checkInvoiceable(options.status, { alreadyInvoiced: options.alreadyInvoiced });
  return priceInvoice({
    priority: options.priority,
    labor: options.labor,
    parts: options.parts,
  });
}
