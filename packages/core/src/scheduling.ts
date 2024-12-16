import { ScheduleConflict, ValidationFailed } from "./errors";

export const MS_PER_HOUR = 3_600_000;

export interface Booking {
  technicianId: number;
  start: Date;
  end: Date;
  /** Present when the booking is already persisted; used to skip self-conflict. */
  id?: number;
}

export function durationMs(start: Date, end: Date): number {
  return end.getTime() - start.getTime();
}

export function hoursBetween(start: Date, end: Date): number {
  return durationMs(start, end) / MS_PER_HOUR;
}

export function isWeekendUtc(moment: Date): boolean {
  const day = moment.getUTCDay();
  return day === 0 || day === 6;
}

export function checkWindow(start: Date, end: Date): void {
  if (end.getTime() <= start.getTime()) {
    throw new ValidationFailed("appointment must end after it starts");
  }
}

/** Half-open [start, end): 09:00–10:00 and 10:00–11:00 sit next to each other. */
export function overlaps(a: Booking, b: Booking): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

export function findConflict(
  candidate: Booking,
  existing: Iterable<Booking>,
): Booking | undefined {
  for (const booked of existing) {
    if (booked.technicianId !== candidate.technicianId) continue;
    // A reschedule passes the saved rows in with everything else; a booking
    // that is being moved is not in the way of itself.
    if (candidate.id !== undefined && booked.id === candidate.id) continue;
    if (overlaps(candidate, booked)) return booked;
  }
  return undefined;
}

export function checkAvailability(
  candidate: Booking,
  existing: Iterable<Booking>,
): void {
  checkWindow(candidate.start, candidate.end);
  if (findConflict(candidate, existing)) {
    throw new ScheduleConflict("technician is already booked for that time");
  }
}
