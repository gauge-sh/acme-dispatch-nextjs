import { describe, expect, it } from "vitest";

import {
  JOB_STATUSES,
  PRIORITIES,
  ROLES,
  isJobStatus,
  isPriority,
  isRole,
} from "./enums";

describe("wire enum values", () => {
  it("match the domain contract exactly", () => {
    expect(ROLES).toEqual(["admin", "dispatcher"]);
    expect(PRIORITIES).toEqual(["low", "normal", "urgent"]);
    expect(JOB_STATUSES).toEqual([
      "requested",
      "scheduled",
      "in_progress",
      "completed",
      "invoiced",
      "cancelled",
    ]);
  });
});

describe("guards", () => {
  it("accept wire values and nothing else", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("Admin")).toBe(false);
    expect(isPriority("urgent")).toBe(true);
    expect(isPriority("URGENT")).toBe(false);
    expect(isJobStatus("in_progress")).toBe(true);
    expect(isJobStatus("in-progress")).toBe(false);
    expect(isJobStatus("")).toBe(false);
  });
});
