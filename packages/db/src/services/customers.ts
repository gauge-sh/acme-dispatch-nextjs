import {
  type Attrs,
  NotFound,
  ValidationFailed,
  parseCustomerCreate,
  parseCustomerUpdate,
} from "@acme/core";
import type { Customer, Prisma } from "@prisma/client";

import { prisma } from "../client";
import { type Page, type PageParams, pageSlice } from "../pagination";

export interface CustomerFilters {
  q?: string;
}

export async function listCustomers(
  filters: CustomerFilters,
  page: PageParams,
): Promise<Page<Customer>> {
  const where: Prisma.CustomerWhereInput = filters.q
    ? {
        OR: [
          { name: { contains: filters.q } },
          { serviceAddress: { contains: filters.q } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { id: "asc" }, ...pageSlice(page) }),
    prisma.customer.count({ where }),
  ]);
  return { items, total, page: page.page, perPage: page.perPage };
}

export async function getCustomer(id: number): Promise<Customer> {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new NotFound("customer not found");
  return customer;
}

export async function createCustomer(input: Attrs): Promise<Customer> {
  return prisma.customer.create({ data: parseCustomerCreate(input) });
}

export async function updateCustomer(id: number, input: Attrs): Promise<Customer> {
  await getCustomer(id);
  return prisma.customer.update({ where: { id }, data: parseCustomerUpdate(input) });
}

export async function deleteCustomer(id: number): Promise<void> {
  await getCustomer(id);
  const jobs = await prisma.job.count({ where: { customerId: id } });
  if (jobs > 0) {
    throw new ValidationFailed("customer has jobs and cannot be deleted");
  }
  await prisma.customer.delete({ where: { id } });
}
