import {
  type Attrs,
  fieldMustExist,
  type JobStatus,
  NotFound,
  type Priority,
  ValidationFailed,
  checkTransition,
  parseJobCreate,
  parseJobUpdate,
  releaseStock,
} from "@acme/core";
import type { Appointment, InvoiceRecord, Job, JobPart, Prisma } from "@prisma/client";

import { prisma } from "../client";
import { type Page, type PageParams, pageSlice } from "../pagination";

export interface JobFilters {
  statuses?: JobStatus[];
  priority?: Priority;
  customerId?: number;
  q?: string;
}

export type JobDetail = Job & {
  appointments: Appointment[];
  jobParts: JobPart[];
  invoiceRecord: InvoiceRecord | null;
};

export async function listJobs(
  filters: JobFilters,
  page: PageParams,
): Promise<Page<Job>> {
  const where: Prisma.JobWhereInput = {};
  if (filters.statuses && filters.statuses.length > 0) {
    where.status = { in: filters.statuses };
  }
  if (filters.priority !== undefined) where.priority = filters.priority;
  if (filters.customerId !== undefined) where.customerId = filters.customerId;
  if (filters.q !== undefined) where.title = { contains: filters.q };
  const [items, total] = await Promise.all([
    prisma.job.findMany({ where, orderBy: { id: "asc" }, ...pageSlice(page) }),
    prisma.job.count({ where }),
  ]);
  return { items, total, page: page.page, perPage: page.perPage };
}

export async function getJob(id: number): Promise<JobDetail> {
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: [{ scheduledStart: "asc" }, { id: "asc" }] },
      jobParts: { orderBy: { id: "asc" } },
      invoiceRecord: true,
    },
  });
  if (!job) throw new NotFound("job not found");
  return job;
}

async function checkCustomerExists(customerId: number): Promise<void> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) fieldMustExist("customer_id");
}

export async function createJob(input: Attrs): Promise<JobDetail> {
  const attrs = parseJobCreate(input);
  await checkCustomerExists(attrs.customerId);
  const job = await prisma.job.create({ data: attrs });
  return getJob(job.id);
}

export async function updateJob(id: number, input: Attrs): Promise<JobDetail> {
  await getJob(id);
  const patch = parseJobUpdate(input);
  if (patch.customerId !== undefined) await checkCustomerExists(patch.customerId);
  await prisma.job.update({ where: { id }, data: patch });
  return getJob(id);
}

export async function deleteJob(id: number): Promise<void> {
  const job = await getJob(id);
  if (job.status === "invoiced") {
    throw new ValidationFailed("an invoiced job cannot be deleted");
  }
  await prisma.$transaction(async (tx) => {
    // Parts recorded against the job go back on the shelf, mirroring what
    // deleting each job part individually would do.
    for (const jobPart of job.jobParts) {
      const stock = await tx.stockLevel.findUnique({ where: { partId: jobPart.partId } });
      if (stock) {
        await tx.stockLevel.update({
          where: { partId: jobPart.partId },
          data: { quantityOnHand: releaseStock(stock.quantityOnHand, jobPart.quantity) },
        });
      }
    }
    await tx.job.delete({ where: { id } });
  });
}

export async function transitionJob(id: number, status: JobStatus): Promise<JobDetail> {
  const job = await getJob(id);
  checkTransition(job.status as JobStatus, status, {
    appointmentCount: job.appointments.length,
  });
  await prisma.job.update({ where: { id }, data: { status } });
  return getJob(id);
}
