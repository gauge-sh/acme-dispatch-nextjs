import {
  type Appointment,
  type Customer,
  type InvoiceLineItem,
  type InvoiceRecord,
  type Job,
  type JobDetail,
  type JobPart,
  type Page,
  type Part,
  type StockLevelWithPart,
  type Technician,
  type User,
  parseSkillTags,
} from "@acme/db";

type Wire = Record<string, unknown>;

// The contract's examples carry whole-second timestamps.
function ts(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

export function pageBody<T>(page: Page<T>, serialize: (item: T) => Wire): Wire {
  return {
    items: page.items.map(serialize),
    page: page.page,
    per_page: page.perPage,
    total: page.total,
  };
}

export function serializeCustomer(customer: Customer): Wire {
  return {
    id: customer.id,
    name: customer.name,
    contact_email: customer.contactEmail,
    phone: customer.phone,
    service_address: customer.serviceAddress,
    notes: customer.notes,
    created_at: ts(customer.createdAt),
    updated_at: ts(customer.updatedAt),
  };
}

export function serializeTechnician(technician: Technician): Wire {
  return {
    id: technician.id,
    name: technician.name,
    phone: technician.phone,
    skill_tags: parseSkillTags(technician.skillTags),
    hourly_cost_cents: technician.hourlyCostCents,
    is_active: technician.isActive,
    created_at: ts(technician.createdAt),
    updated_at: ts(technician.updatedAt),
  };
}

export function serializeUser(user: User): Wire {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    is_active: user.isActive,
    created_at: ts(user.createdAt),
    updated_at: ts(user.updatedAt),
  };
}

export function serializeJob(job: Job): Wire {
  return {
    id: job.id,
    customer_id: job.customerId,
    title: job.title,
    description: job.description,
    priority: job.priority,
    status: job.status,
    created_at: ts(job.createdAt),
    updated_at: ts(job.updatedAt),
  };
}

export function serializeAppointment(appointment: Appointment): Wire {
  return {
    id: appointment.id,
    job_id: appointment.jobId,
    technician_id: appointment.technicianId,
    scheduled_start: ts(appointment.scheduledStart),
    scheduled_end: ts(appointment.scheduledEnd),
    completion_notes: appointment.completionNotes,
    created_at: ts(appointment.createdAt),
    updated_at: ts(appointment.updatedAt),
  };
}

export function serializeJobPart(jobPart: JobPart): Wire {
  return {
    id: jobPart.id,
    job_id: jobPart.jobId,
    part_id: jobPart.partId,
    quantity: jobPart.quantity,
    unit_price_cents: jobPart.unitPriceCents,
    created_at: ts(jobPart.createdAt),
    updated_at: ts(jobPart.updatedAt),
  };
}

export function serializeJobDetail(job: JobDetail): Wire {
  return {
    id: job.id,
    customer_id: job.customerId,
    title: job.title,
    description: job.description,
    priority: job.priority,
    status: job.status,
    appointments: job.appointments.map(serializeAppointment),
    job_parts: job.jobParts.map(serializeJobPart),
    invoice_record_id: job.invoiceRecord?.id ?? null,
    created_at: ts(job.createdAt),
    updated_at: ts(job.updatedAt),
  };
}

export function serializePart(part: Part): Wire {
  return {
    id: part.id,
    sku: part.sku,
    name: part.name,
    unit_cost_cents: part.unitCostCents,
    unit_price_cents: part.unitPriceCents,
    created_at: ts(part.createdAt),
    updated_at: ts(part.updatedAt),
  };
}

export function serializeStockLevel(stock: StockLevelWithPart): Wire {
  return {
    id: stock.id,
    part_id: stock.partId,
    quantity_on_hand: stock.quantityOnHand,
    part: serializePart(stock.part),
    created_at: ts(stock.createdAt),
    updated_at: ts(stock.updatedAt),
  };
}

function serializeLineItem(line: InvoiceLineItem): Wire {
  return {
    kind: line.kind,
    description: line.description,
    quantity: line.quantity,
    unit_cents: line.unitCents,
    amount_cents: line.amountCents,
    weekend: line.weekend,
  };
}

export function serializeInvoice(
  record: InvoiceRecord & { lineItems: InvoiceLineItem[] },
): Wire {
  return {
    id: record.id,
    job_id: record.jobId,
    labor_cents: record.laborCents,
    parts_cents: record.partsCents,
    total_cents: record.totalCents,
    line_items: record.lineItems.map(serializeLineItem),
    created_at: ts(record.createdAt),
    updated_at: ts(record.updatedAt),
  };
}
