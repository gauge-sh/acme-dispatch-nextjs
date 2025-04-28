import {
  type JobStatus,
  NotFound,
  type Priority,
  draftInvoice,
} from "@acme/core";
import type { InvoiceLineItem, InvoiceRecord, Prisma } from "@prisma/client";

import { prisma } from "../client";
import { type Page, type PageParams, pageSlice } from "../pagination";

export type InvoiceWithLines = InvoiceRecord & { lineItems: InvoiceLineItem[] };

const withLines = {
  lineItems: { orderBy: { position: "asc" } },
} satisfies Prisma.InvoiceRecordInclude;

export async function createInvoiceForJob(jobId: number): Promise<InvoiceWithLines> {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findUnique({
      where: { id: jobId },
      include: {
        appointments: { include: { technician: true } },
        jobParts: { include: { part: true } },
        invoiceRecord: true,
      },
    });
    if (!job) throw new NotFound("job not found");

    const priced = draftInvoice({
      status: job.status as JobStatus,
      priority: job.priority as Priority,
      alreadyInvoiced: job.invoiceRecord !== null,
      labor: job.appointments.map((appointment) => ({
        appointmentId: appointment.id,
        technicianName: appointment.technician.name,
        hourlyCostCents: appointment.technician.hourlyCostCents,
        start: appointment.scheduledStart,
        end: appointment.scheduledEnd,
      })),
      parts: job.jobParts.map((jobPart) => ({
        jobPartId: jobPart.id,
        sku: jobPart.part.sku,
        name: jobPart.part.name,
        quantity: jobPart.quantity,
        unitPriceCents: jobPart.unitPriceCents,
      })),
    });

    const record = await tx.invoiceRecord.create({
      data: {
        jobId,
        laborCents: priced.laborCents,
        partsCents: priced.partsCents,
        totalCents: priced.totalCents,
        lineItems: {
          create: priced.lineItems.map((line, index) => ({
            position: index + 1,
            kind: line.kind,
            description: line.description,
            quantity: line.quantity,
            unitCents: line.unitCents,
            amountCents: line.amountCents,
            weekend: line.weekend,
          })),
        },
      },
      include: withLines,
    });
    await tx.job.update({ where: { id: jobId }, data: { status: "invoiced" } });
    return record;
  });
}

export interface InvoiceFilters {
  jobId?: number;
  customerId?: number;
}

export async function listInvoices(
  filters: InvoiceFilters,
  page: PageParams,
): Promise<Page<InvoiceWithLines>> {
  const where: Prisma.InvoiceRecordWhereInput = {};
  if (filters.jobId !== undefined) where.jobId = filters.jobId;
  if (filters.customerId !== undefined) where.job = { customerId: filters.customerId };
  const [items, total] = await Promise.all([
    prisma.invoiceRecord.findMany({
      where,
      include: withLines,
      orderBy: { id: "asc" },
      ...pageSlice(page),
    }),
    prisma.invoiceRecord.count({ where }),
  ]);
  return { items, total, page: page.page, perPage: page.perPage };
}

export async function getInvoice(id: number): Promise<InvoiceWithLines> {
  const record = await prisma.invoiceRecord.findUnique({
    where: { id },
    include: withLines,
  });
  if (!record) throw new NotFound("invoice record not found");
  return record;
}
