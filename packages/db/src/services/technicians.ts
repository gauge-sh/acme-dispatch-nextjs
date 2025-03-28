import {
  type Attrs,
  NotFound,
  ValidationFailed,
  parseTechnicianCreate,
  parseTechnicianUpdate,
} from "@acme/core";
import type { Prisma, Technician } from "@prisma/client";

import { prisma } from "../client";
import { type Page, type PageParams, pageSlice } from "../pagination";

export function parseSkillTags(json: string): string[] {
  return JSON.parse(json) as string[];
}

export interface TechnicianFilters {
  isActive?: boolean;
  skill?: string;
}

export async function listTechnicians(
  filters: TechnicianFilters,
  page: PageParams,
): Promise<Page<Technician>> {
  const where: Prisma.TechnicianWhereInput = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.skill !== undefined) {
    // Tags are stored canonically (lower-case, JSON-encoded), so matching the
    // quoted form is an exact tag match, not a substring one.
    where.skillTags = { contains: JSON.stringify(filters.skill) };
  }
  const [items, total] = await Promise.all([
    prisma.technician.findMany({ where, orderBy: { id: "asc" }, ...pageSlice(page) }),
    prisma.technician.count({ where }),
  ]);
  return { items, total, page: page.page, perPage: page.perPage };
}

export async function getTechnician(id: number): Promise<Technician> {
  const technician = await prisma.technician.findUnique({ where: { id } });
  if (!technician) throw new NotFound("technician not found");
  return technician;
}

export async function createTechnician(input: Attrs): Promise<Technician> {
  const attrs = parseTechnicianCreate(input);
  return prisma.technician.create({
    data: { ...attrs, skillTags: JSON.stringify(attrs.skillTags) },
  });
}

export async function updateTechnician(id: number, input: Attrs): Promise<Technician> {
  await getTechnician(id);
  const { skillTags, ...rest } = parseTechnicianUpdate(input);
  return prisma.technician.update({
    where: { id },
    data:
      skillTags === undefined
        ? rest
        : { ...rest, skillTags: JSON.stringify(skillTags) },
  });
}

export async function deleteTechnician(id: number): Promise<void> {
  await getTechnician(id);
  const appointments = await prisma.appointment.count({ where: { technicianId: id } });
  if (appointments > 0) {
    throw new ValidationFailed("technician has appointments and cannot be deleted");
  }
  await prisma.technician.delete({ where: { id } });
}
