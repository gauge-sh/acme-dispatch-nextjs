export { prisma } from "./client";
export { Prisma, PrismaClient } from "@prisma/client";
export type {
  ApiToken,
  Appointment,
  Customer,
  InvoiceLineItem,
  InvoiceRecord,
  Job,
  JobPart,
  Part,
  StockLevel,
  Technician,
  User,
} from "@prisma/client";

export {
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
  pageSlice,
  type Page,
  type PageParams,
} from "./pagination";

export * from "./services/customers";
export * from "./services/technicians";
export * from "./services/users";
