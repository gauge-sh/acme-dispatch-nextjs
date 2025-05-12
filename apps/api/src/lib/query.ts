import {
  type JobStatus,
  type Priority,
  type Role,
  ValidationFailed,
  isJobStatus,
  isPriority,
  isRole,
} from "@acme/core";
import { DEFAULT_PER_PAGE, MAX_PER_PAGE, type PageParams } from "@acme/db";

function positiveInt(raw: string): number | undefined {
  if (!/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value >= 1 ? value : undefined;
}

export function parsePagination(params: URLSearchParams): PageParams {
  const rawPage = params.get("page");
  const rawPerPage = params.get("per_page");
  const page = rawPage === null ? 1 : positiveInt(rawPage);
  const perPage = rawPerPage === null ? DEFAULT_PER_PAGE : positiveInt(rawPerPage);
  if (page === undefined || perPage === undefined) {
    throw new ValidationFailed("page and per_page must be positive integers");
  }
  // Above the cap is clamped, not rejected.
  return { page, perPage: Math.min(perPage, MAX_PER_PAGE) };
}

export function intFilter(params: URLSearchParams, name: string): number | undefined {
  const raw = params.get(name);
  if (raw === null) return undefined;
  const value = positiveInt(raw);
  if (value === undefined) {
    throw new ValidationFailed(`${name} must be a positive integer`);
  }
  return value;
}

export function boolFilter(params: URLSearchParams, name: string): boolean | undefined {
  const raw = params.get(name);
  if (raw === null) return undefined;
  if (raw !== "true" && raw !== "false") {
    throw new ValidationFailed(`${name} must be true or false`);
  }
  return raw === "true";
}

export function dateFilter(params: URLSearchParams, name: string): Date | undefined {
  const raw = params.get(name);
  if (raw === null) return undefined;
  if (Number.isNaN(Date.parse(raw))) {
    throw new ValidationFailed(`${name} must be an ISO-8601 timestamp`);
  }
  return new Date(raw);
}

export function statusListFilter(params: URLSearchParams): JobStatus[] | undefined {
  const raw = params.get("status");
  if (raw === null) return undefined;
  const statuses = raw.split(",").map((value) => value.trim());
  if (statuses.some((value) => !isJobStatus(value))) {
    throw new ValidationFailed("unknown status");
  }
  return statuses as JobStatus[];
}

export function priorityFilter(params: URLSearchParams): Priority | undefined {
  const raw = params.get("priority");
  if (raw === null) return undefined;
  if (!isPriority(raw)) throw new ValidationFailed("unknown priority");
  return raw;
}

export function roleFilter(params: URLSearchParams): Role | undefined {
  const raw = params.get("role");
  if (raw === null) return undefined;
  if (!isRole(raw)) throw new ValidationFailed("unknown role");
  return raw;
}

export function textFilter(params: URLSearchParams, name: string): string | undefined {
  return params.get(name) ?? undefined;
}
