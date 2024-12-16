import { describe, expect, it } from "vitest";

import { ScheduleConflict, ValidationFailed } from "./errors";
import {
  type Booking,
  checkAvailability,
  checkWindow,
  findConflict,
  hoursBetween,
  isWeekendUtc,
  overlaps,
} from "./scheduling";

function booking(
  technicianId: number,
  start: string,
  end: string,
  id?: number,
): Booking {
  return { technicianId, start: new Date(start), end: new Date(end), id };
}

describe("overlaps", () => {
  const base = booking(1, "2025-03-12T09:00:00Z", "2025-03-12T10:00:00Z");

  it("detects a partial overlap on either side", () => {
    expect(overlaps(base, booking(1, "2025-03-12T09:30:00Z", "2025-03-12T10:30:00Z"))).toBe(true);
    expect(overlaps(base, booking(1, "2025-03-12T08:30:00Z", "2025-03-12T09:30:00Z"))).toBe(true);
  });

  it("detects containment both ways", () => {
    expect(overlaps(base, booking(1, "2025-03-12T09:15:00Z", "2025-03-12T09:45:00Z"))).toBe(true);
    expect(overlaps(base, booking(1, "2025-03-12T08:00:00Z", "2025-03-12T11:00:00Z"))).toBe(true);
  });

  it("detects an identical window", () => {
    expect(overlaps(base, booking(1, "2025-03-12T09:00:00Z", "2025-03-12T10:00:00Z"))).toBe(true);
  });

  it("treats touching endpoints as free", () => {
    expect(overlaps(base, booking(1, "2025-03-12T10:00:00Z", "2025-03-12T11:00:00Z"))).toBe(false);
    expect(overlaps(base, booking(1, "2025-03-12T08:00:00Z", "2025-03-12T09:00:00Z"))).toBe(false);
  });

  it("ignores disjoint windows", () => {
    expect(overlaps(base, booking(1, "2025-03-12T12:00:00Z", "2025-03-12T13:00:00Z"))).toBe(false);
  });
});

describe("findConflict", () => {
  const existing = [
    booking(1, "2025-03-12T09:00:00Z", "2025-03-12T10:00:00Z", 10),
    booking(2, "2025-03-12T09:00:00Z", "2025-03-12T10:00:00Z", 11),
  ];

  it("only considers the same technician", () => {
    const candidate = booking(3, "2025-03-12T09:00:00Z", "2025-03-12T10:00:00Z");
    expect(findConflict(candidate, existing)).toBeUndefined();
  });

  it("finds the clashing booking", () => {
    const candidate = booking(1, "2025-03-12T09:30:00Z", "2025-03-12T11:00:00Z");
    expect(findConflict(candidate, existing)?.id).toBe(10);
  });

  it("does not conflict with itself on reschedule", () => {
    const moved = booking(1, "2025-03-12T09:15:00Z", "2025-03-12T10:15:00Z", 10);
    expect(findConflict(moved, existing)).toBeUndefined();
  });

  it("still conflicts with other bookings on reschedule", () => {
    const moved = booking(2, "2025-03-12T09:15:00Z", "2025-03-12T10:15:00Z", 10);
    expect(findConflict(moved, existing)?.id).toBe(11);
  });
});

describe("checkAvailability", () => {
  it("throws ScheduleConflict on overlap", () => {
    const existing = [booking(1, "2025-03-12T09:00:00Z", "2025-03-12T10:00:00Z", 1)];
    expect(() =>
      checkAvailability(booking(1, "2025-03-12T09:30:00Z", "2025-03-12T10:30:00Z"), existing),
    ).toThrow(new ScheduleConflict("technician is already booked for that time"));
  });

  it("accepts a back-to-back booking", () => {
    const existing = [booking(1, "2025-03-12T09:00:00Z", "2025-03-12T10:00:00Z", 1)];
    expect(() =>
      checkAvailability(booking(1, "2025-03-12T10:00:00Z", "2025-03-12T11:00:00Z"), existing),
    ).not.toThrow();
  });
});

describe("checkWindow", () => {
  it("rejects an end at or before the start", () => {
    const at = new Date("2025-03-12T09:00:00Z");
    expect(() => checkWindow(at, at)).toThrow(
      new ValidationFailed("appointment must end after it starts"),
    );
    expect(() => checkWindow(at, new Date("2025-03-12T08:59:59Z"))).toThrow(ValidationFailed);
  });
});

describe("hoursBetween", () => {
  it("keeps exact fractions of an hour", () => {
    expect(hoursBetween(new Date("2025-03-12T09:00:00Z"), new Date("2025-03-12T10:30:00Z"))).toBe(1.5);
    expect(hoursBetween(new Date("2025-03-12T09:00:00Z"), new Date("2025-03-12T09:15:00Z"))).toBe(0.25);
  });
});

describe("isWeekendUtc", () => {
  it("uses the UTC day, not local time", () => {
    expect(isWeekendUtc(new Date("2025-03-15T00:00:00Z"))).toBe(true); // Saturday
    expect(isWeekendUtc(new Date("2025-03-16T23:59:59Z"))).toBe(true); // Sunday
    expect(isWeekendUtc(new Date("2025-03-14T23:59:59Z"))).toBe(false); // Friday night
    expect(isWeekendUtc(new Date("2025-03-17T00:00:00Z"))).toBe(false); // Monday
  });
});
