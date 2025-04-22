import {
  type Attrs,
  NotFound,
  ValidationFailed,
  adjustStock,
  checkPartPricing,
  parsePartCreate,
  parsePartUpdate,
} from "@acme/core";
import type { Part, Prisma, StockLevel } from "@prisma/client";

import { prisma } from "../client";
import { type Page, type PageParams, pageSlice } from "../pagination";

export interface PartFilters {
  q?: string;
}

export async function listParts(
  filters: PartFilters,
  page: PageParams,
): Promise<Page<Part>> {
  const where: Prisma.PartWhereInput = filters.q
    ? { OR: [{ sku: { contains: filters.q } }, { name: { contains: filters.q } }] }
    : {};
  const [items, total] = await Promise.all([
    prisma.part.findMany({ where, orderBy: { id: "asc" }, ...pageSlice(page) }),
    prisma.part.count({ where }),
  ]);
  return { items, total, page: page.page, perPage: page.perPage };
}

export async function getPart(id: number): Promise<Part> {
  const part = await prisma.part.findUnique({ where: { id } });
  if (!part) throw new NotFound("part not found");
  return part;
}

async function checkSkuFree(sku: string, exceptId?: number): Promise<void> {
  const existing = await prisma.part.findUnique({ where: { sku } });
  if (existing && existing.id !== exceptId) {
    throw new ValidationFailed("sku is already in use", {
      sku: "sku is already in use",
    });
  }
}

export async function createPart(input: Attrs): Promise<Part> {
  const attrs = parsePartCreate(input);
  await checkSkuFree(attrs.sku);
  // Every part carries a stock level from birth, starting empty.
  return prisma.part.create({
    data: { ...attrs, stockLevel: { create: { quantityOnHand: 0 } } },
  });
}

export async function updatePart(id: number, input: Attrs): Promise<Part> {
  const part = await getPart(id);
  const patch = parsePartUpdate(input);
  if (patch.sku !== undefined) await checkSkuFree(patch.sku, id);
  checkPartPricing(
    patch.unitCostCents ?? part.unitCostCents,
    patch.unitPriceCents ?? part.unitPriceCents,
  );
  return prisma.part.update({ where: { id }, data: patch });
}

export async function deletePart(id: number): Promise<void> {
  await getPart(id);
  const used = await prisma.jobPart.count({ where: { partId: id } });
  if (used > 0) {
    throw new ValidationFailed("part has been used on a job and cannot be deleted");
  }
  await prisma.part.delete({ where: { id } });
}

export type StockLevelWithPart = StockLevel & { part: Part };

export interface StockFilters {
  partId?: number;
}

export async function listStockLevels(
  filters: StockFilters,
  page: PageParams,
): Promise<Page<StockLevelWithPart>> {
  const where: Prisma.StockLevelWhereInput = {};
  if (filters.partId !== undefined) where.partId = filters.partId;
  const [items, total] = await Promise.all([
    prisma.stockLevel.findMany({
      where,
      include: { part: true },
      orderBy: { partId: "asc" },
      ...pageSlice(page),
    }),
    prisma.stockLevel.count({ where }),
  ]);
  return { items, total, page: page.page, perPage: page.perPage };
}

export async function adjustStockLevel(
  partId: number,
  delta: number,
): Promise<StockLevelWithPart> {
  return prisma.$transaction(async (tx) => {
    const stock = await tx.stockLevel.findUnique({ where: { partId } });
    if (!stock) throw new NotFound("part not found");
    const quantityOnHand = adjustStock(stock.quantityOnHand, delta);
    return tx.stockLevel.update({
      where: { partId },
      data: { quantityOnHand },
      include: { part: true },
    });
  });
}
