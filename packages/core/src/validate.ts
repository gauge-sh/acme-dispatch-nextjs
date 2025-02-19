import { ValidationFailed } from "./errors";

/** A request body after JSON parsing: wire keys, unknown values. */
export type Attrs = Record<string, unknown>;

export class FieldErrors {
  private readonly messages: Record<string, string> = {};
  private first: string | undefined;

  add(field: string, message: string): void {
    if (field in this.messages) return;
    this.messages[field] = message;
    this.first ??= message;
  }

  /** Throws with the first message as the summary and the full map as fields. */
  throwIfAny(): void {
    if (this.first !== undefined) {
      throw new ValidationFailed(this.first, this.messages);
    }
  }
}

interface StringRules {
  max: number;
  min?: number;
  required?: boolean;
  nullable?: boolean;
}

function lengthMessage(field: string, min: number, max: number): string {
  if (min <= 1) {
    return min === 0
      ? `${field} must be at most ${max} characters`
      : `${field} must be 1-${max} characters`;
  }
  return `${field} must be ${min}-${max} characters`;
}

/**
 * Returns the trimmed value, `null` for an explicit clear of a nullable
 * field, or `undefined` when the key is absent or invalid (the error is
 * recorded on `errors`).
 */
export function readString(
  input: Attrs,
  field: string,
  rules: StringRules,
  errors: FieldErrors,
): string | null | undefined {
  if (!(field in input)) {
    if (rules.required) errors.add(field, `${field} is required`);
    return undefined;
  }
  const value = input[field];
  if (value === null) {
    if (rules.nullable) return null;
    errors.add(field, `${field} is required`);
    return undefined;
  }
  if (typeof value !== "string") {
    errors.add(field, `${field} must be a string`);
    return undefined;
  }
  const trimmed = value.trim();
  const min = rules.min ?? 1;
  if (trimmed.length < min || trimmed.length > rules.max) {
    errors.add(field, lengthMessage(field, min, rules.max));
    return undefined;
  }
  return trimmed;
}

export function readEmail(
  input: Attrs,
  field: string,
  rules: { required?: boolean; nullable?: boolean; lowercase?: boolean },
  errors: FieldErrors,
): string | null | undefined {
  const value = readString(input, field, { max: 254, ...rules }, errors);
  if (typeof value !== "string") return value;
  if (!value.includes("@")) {
    errors.add(field, `${field} must contain @`);
    return undefined;
  }
  return rules.lowercase ? value.toLowerCase() : value;
}

export function readInt(
  input: Attrs,
  field: string,
  rules: { min?: number; required?: boolean },
  errors: FieldErrors,
): number | undefined {
  if (!(field in input)) {
    if (rules.required) errors.add(field, `${field} is required`);
    return undefined;
  }
  const value = input[field];
  const min = rules.min ?? 1;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    errors.add(
      field,
      min >= 1 ? `${field} must be a positive integer` : `${field} must be an integer`,
    );
    return undefined;
  }
  return value;
}

export function readBool(
  input: Attrs,
  field: string,
  rules: { required?: boolean },
  errors: FieldErrors,
): boolean | undefined {
  if (!(field in input)) {
    if (rules.required) errors.add(field, `${field} is required`);
    return undefined;
  }
  const value = input[field];
  if (typeof value !== "boolean") {
    errors.add(field, `${field} must be true or false`);
    return undefined;
  }
  return value;
}

export function readEnum<T extends string>(
  input: Attrs,
  field: string,
  options: { guard: (value: string) => value is T; label: string; required?: boolean },
  errors: FieldErrors,
): T | undefined {
  if (!(field in input)) {
    if (options.required) errors.add(field, `${field} is required`);
    return undefined;
  }
  const value = input[field];
  if (typeof value !== "string" || !options.guard(value)) {
    errors.add(field, `unknown ${options.label}`);
    return undefined;
  }
  return value;
}

export function readTimestamp(
  input: Attrs,
  field: string,
  rules: { required?: boolean },
  errors: FieldErrors,
): Date | undefined {
  if (!(field in input)) {
    if (rules.required) errors.add(field, `${field} is required`);
    return undefined;
  }
  const value = input[field];
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    errors.add(field, `${field} must be an ISO-8601 timestamp`);
    return undefined;
  }
  return new Date(value);
}
