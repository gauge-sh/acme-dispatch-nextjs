import {
  type AppointmentAttrs,
  type Attrs,
  type Booking,
  fieldMustExist,
  type JobStatus,
  NotFound,
  ValidationFailed,
  checkAcceptsAppointments,
  checkAvailability,
  parseAppointmentCreate,
  parseAppointmentUpdate,
} from "@acme/core";
import type { Appointment, Prisma } from "@prisma/client";

import { prisma } from "../client";
import { type Page, type PageParams, pageSlice } from "../pagination";

export interface AppointmentFilters {
  jobId?: number;
  technicianId?: number;
  from?: Date;
  to?: Date;
}

export async function listAppointments(
  filters: AppointmentFilters,
  page: PageParams,
): Promise<Page<Appointment>> {
  const where: Prisma.AppointmentWhereInput = {};
  if (filters.jobId !== undefined) where.jobId = filters.jobId;
  if (filters.technicianId !== undefined) where.technicianId = filters.technicianId;
  if (filters.from !== undefined || filters.to !== undefined) {
    where.scheduledStart = {
      ...(filters.from !== undefined ? { gte: filters.from } : {}),
      ...(filters.to !== undefined ? { lte: filters.to } : {}),
    };
  }
  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: [{ scheduledStart: "asc" }, { id: "asc" }],
      ...pageSlice(page),
    }),
    prisma.appointment.count({ where }),
  ]);
  return { items, total, page: page.page, perPage: page.perPage };
}

export async function getAppointment(id: number): Promise<Appointment> {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) throw new NotFound("appointment not found");
  return appointment;
}

async function checkJobAcceptsAppointment(jobId: number): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) fieldMustExist("job_id");
  checkAcceptsAppointments(job.status as JobStatus);
}

async function checkTechnicianAssignable(technicianId: number): Promise<void> {
  const technician = await prisma.technician.findUnique({ where: { id: technicianId } });
  if (!technician) fieldMustExist("technician_id");
  if (!technician.isActive) {
    throw new ValidationFailed("technician is not active", {
      technician_id: "technician is not active",
    });
  }
}

async function checkNoConflict(candidate: Booking): Promise<void> {
  const existing = await prisma.appointment.findMany({
    where: { technicianId: candidate.technicianId },
  });
  checkAvailability(
    candidate,
    existing.map((row) => ({
      id: row.id,
      technicianId: row.technicianId,
      start: row.scheduledStart,
      end: row.scheduledEnd,
    })),
  );
}

export async function createAppointment(input: Attrs): Promise<Appointment> {
  const attrs = parseAppointmentCreate(input);
  await checkJobAcceptsAppointment(attrs.jobId);
  await checkTechnicianAssignable(attrs.technicianId);
  await checkNoConflict({
    technicianId: attrs.technicianId,
    start: attrs.scheduledStart,
    end: attrs.scheduledEnd,
  });
  return prisma.appointment.create({ data: attrs });
}

export async function updateAppointment(id: number, input: Attrs): Promise<Appointment> {
  const current = await getAppointment(id);
  const patch = parseAppointmentUpdate(input);
  const next: AppointmentAttrs = {
    jobId: patch.jobId ?? current.jobId,
    technicianId: patch.technicianId ?? current.technicianId,
    scheduledStart: patch.scheduledStart ?? current.scheduledStart,
    scheduledEnd: patch.scheduledEnd ?? current.scheduledEnd,
    completionNotes:
      patch.completionNotes !== undefined ? patch.completionNotes : current.completionNotes,
  };
  if (next.jobId !== current.jobId) {
    await checkJobAcceptsAppointment(next.jobId);
  }
  if (next.technicianId !== current.technicianId) {
    await checkTechnicianAssignable(next.technicianId);
  }
  await checkNoConflict({
    id,
    technicianId: next.technicianId,
    start: next.scheduledStart,
    end: next.scheduledEnd,
  });
  return prisma.appointment.update({ where: { id }, data: next });
}

export async function deleteAppointment(id: number): Promise<void> {
  await getAppointment(id);
  await prisma.appointment.delete({ where: { id } });
}
