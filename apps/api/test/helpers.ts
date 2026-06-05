import type { Role } from "@acme/core";
import {
  type Appointment,
  type Customer,
  type Job,
  type Part,
  type Technician,
  type User,
  issueToken,
  prisma,
} from "@acme/db";

import type { RouteContext } from "@/lib/http";

export async function resetDb(): Promise<void> {
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoiceRecord.deleteMany();
  await prisma.jobPart.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.job.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.part.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.apiToken.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
}

let userCounter = 0;

export async function createUser(
  role: Role = "dispatcher",
  overrides: Partial<{ email: string; name: string; isActive: boolean }> = {},
): Promise<User> {
  userCounter += 1;
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user${userCounter}@test.example`,
      name: overrides.name ?? `Test User ${userCounter}`,
      role,
      isActive: overrides.isActive ?? true,
    },
  });
}

export interface Session {
  user: User;
  token: string;
}

export async function signIn(role: Role = "dispatcher"): Promise<Session> {
  const user = await createUser(role);
  const { plaintext } = await issueToken(user.id, { name: "test" });
  return { user, token: plaintext };
}

export function request(
  method: string,
  url: string,
  options: { token?: string; body?: unknown } = {},
): Request {
  const headers = new Headers();
  if (options.token !== undefined) {
    headers.set("authorization", `Bearer ${options.token}`);
  }
  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.body);
  }
  return new Request(`http://api.test${url}`, { method, headers, body });
}

export function ctx(params: Record<string, string> = {}): RouteContext {
  return { params: Promise.resolve(params) };
}

export async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

export async function errorOf(
  response: Response,
): Promise<{ code: string; message: string; fields?: Record<string, string> }> {
  const parsed = await body(response);
  return parsed["error"] as { code: string; message: string; fields?: Record<string, string> };
}

export async function makeCustomer(overrides: Partial<Customer> = {}): Promise<Customer> {
  return prisma.customer.create({
    data: {
      name: "Harbor Light Bakery",
      contactEmail: "ops@harborlight.example",
      phone: "555-0142",
      serviceAddress: "18 Quay St",
      notes: null,
      ...overrides,
    },
  });
}

export async function makeTechnician(
  overrides: Partial<Technician> = {},
): Promise<Technician> {
  return prisma.technician.create({
    data: {
      name: "Dana Reyes",
      phone: "555-0112",
      skillTags: JSON.stringify(["hvac"]),
      hourlyCostCents: 8000,
      isActive: true,
      ...overrides,
    },
  });
}

export async function makeJob(
  customerId: number,
  overrides: Partial<Job> = {},
): Promise<Job> {
  return prisma.job.create({
    data: {
      customerId,
      title: "Furnace not igniting",
      description: null,
      priority: "normal",
      status: "requested",
      ...overrides,
    },
  });
}

export async function makeAppointment(
  jobId: number,
  technicianId: number,
  overrides: Partial<Appointment> = {},
): Promise<Appointment> {
  return prisma.appointment.create({
    data: {
      jobId,
      technicianId,
      scheduledStart: new Date("2025-03-12T13:00:00Z"),
      scheduledEnd: new Date("2025-03-12T14:30:00Z"),
      completionNotes: null,
      ...overrides,
    },
  });
}

export async function makePart(
  overrides: Partial<Part> & { onHand?: number } = {},
): Promise<Part> {
  const { onHand, ...rest } = overrides;
  return prisma.part.create({
    data: {
      sku: rest.sku ?? "IGN-4420",
      name: "Hot surface igniter",
      unitCostCents: 780,
      unitPriceCents: 1299,
      ...rest,
      stockLevel: { create: { quantityOnHand: onHand ?? 0 } },
    },
  });
}
