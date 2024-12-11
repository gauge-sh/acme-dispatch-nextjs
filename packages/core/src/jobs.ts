import type { JobStatus } from "./enums";
import { InvalidTransition, ValidationFailed } from "./errors";

const NEXT: Record<JobStatus, readonly JobStatus[]> = {
  requested: ["scheduled", "cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["invoiced"],
  invoiced: [],
  cancelled: [],
};

const TERMINAL: readonly JobStatus[] = ["invoiced", "cancelled"];

export function allowedTransitions(from: JobStatus): readonly JobStatus[] {
  return NEXT[from];
}

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return NEXT[from].includes(to);
}

export function isTerminal(status: JobStatus): boolean {
  return TERMINAL.includes(status);
}

/**
 * Guard the generic transition path. `completed → invoiced` is a real edge in
 * the machine, but only invoice creation may take it, so asking for it here is
 * always refused.
 */
export function checkTransition(
  from: JobStatus,
  to: JobStatus,
  options: { appointmentCount: number },
): void {
  if (to === "invoiced" || !canTransition(from, to)) {
    throw new InvalidTransition(`cannot move a job from ${from} to ${to}`);
  }
  if (to === "scheduled" && options.appointmentCount < 1) {
    throw new ValidationFailed(
      "a job needs an appointment before it can be scheduled",
    );
  }
}

export function checkAcceptsAppointments(status: JobStatus): void {
  if (status === "completed" || isTerminal(status)) {
    throw new ValidationFailed(
      `appointments cannot be added to a job that is ${status}`,
    );
  }
}

export function checkAcceptsParts(status: JobStatus): void {
  if (isTerminal(status)) {
    throw new ValidationFailed(
      `parts cannot be added to a job that is ${status}`,
    );
  }
}
