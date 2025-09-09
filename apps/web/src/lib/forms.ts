import { DomainError, type Attrs } from "@acme/core";

export interface ActionState {
  error: string;
  fields: Record<string, string>;
}

/** Domain rule violations become form feedback; anything else is a bug. */
export function actionError(error: unknown): ActionState {
  if (error instanceof DomainError) {
    return { error: error.message, fields: error.fields };
  }
  throw error;
}

export function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Empty inputs on nullable fields mean "clear it". */
export function textOrNull(data: FormData, key: string): string | null {
  const value = text(data, key);
  return value === "" ? null : value;
}

export function intOrUndefined(data: FormData, key: string): number | undefined {
  const value = text(data, key);
  if (value === "" || !/^-?\d+$/.test(value)) return undefined;
  return Number(value);
}

/** Money is typed in dollars but stored in cents. */
export function dollarsToCents(data: FormData, key: string): number | undefined {
  const value = text(data, key);
  if (value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.round(parsed * 100);
}

export function checkbox(data: FormData, key: string): boolean {
  return data.get(key) === "on";
}

/** datetime-local inputs carry no zone; the product treats them as UTC. */
export function utcTimestamp(data: FormData, key: string): string | undefined {
  const value = text(data, key);
  if (value === "") return undefined;
  return `${value}:00Z`;
}

export function tagList(data: FormData, key: string): string[] {
  return text(data, key)
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export type { Attrs };
