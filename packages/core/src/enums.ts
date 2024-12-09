export const ROLES = ["admin", "dispatcher"] as const;
export type Role = (typeof ROLES)[number];

export const PRIORITIES = ["low", "normal", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const JOB_STATUSES = [
  "requested",
  "scheduled",
  "in_progress",
  "completed",
  "invoiced",
  "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export type LineKind = "labor" | "part";

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value);
}

export function isJobStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value);
}
