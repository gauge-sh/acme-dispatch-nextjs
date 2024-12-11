export type DomainErrorCode =
  | "validation_failed"
  | "not_found"
  | "invalid_transition"
  | "schedule_conflict"
  | "insufficient_stock";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly fields: Record<string, string>;

  constructor(
    code: DomainErrorCode,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.fields = fields ?? {};
  }
}

export class ValidationFailed extends DomainError {
  constructor(message: string, fields?: Record<string, string>) {
    super("validation_failed", message, fields);
  }
}

export class NotFound extends DomainError {
  constructor(message: string) {
    super("not_found", message);
  }
}

export class InvalidTransition extends DomainError {
  constructor(message: string) {
    super("invalid_transition", message);
  }
}

export class ScheduleConflict extends DomainError {
  constructor(message: string) {
    super("schedule_conflict", message);
  }
}

export class InsufficientStock extends DomainError {
  constructor(message: string) {
    super("insufficient_stock", message);
  }
}
