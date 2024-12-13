import { describe, expect, it } from "vitest";

import { JOB_STATUSES, type JobStatus } from "./enums";
import { InvalidTransition, ValidationFailed } from "./errors";
import {
  allowedTransitions,
  canTransition,
  checkAcceptsAppointments,
  checkAcceptsParts,
  checkTransition,
  isTerminal,
} from "./jobs";

const LEGAL: ReadonlyArray<[JobStatus, JobStatus]> = [
  ["requested", "scheduled"],
  ["requested", "cancelled"],
  ["scheduled", "in_progress"],
  ["scheduled", "cancelled"],
  ["in_progress", "completed"],
  ["in_progress", "cancelled"],
  ["completed", "invoiced"],
];

describe("status machine", () => {
  it("allows exactly the legal edges", () => {
    for (const from of JOB_STATUSES) {
      for (const to of JOB_STATUSES) {
        const legal = LEGAL.some(([f, t]) => f === from && t === to);
        expect(canTransition(from, to), `${from} -> ${to}`).toBe(legal);
      }
    }
  });

  it("lists successors per status", () => {
    expect(allowedTransitions("requested")).toEqual(["scheduled", "cancelled"]);
    expect(allowedTransitions("completed")).toEqual(["invoiced"]);
    expect(allowedTransitions("invoiced")).toEqual([]);
    expect(allowedTransitions("cancelled")).toEqual([]);
  });

  it("treats invoiced and cancelled as terminal", () => {
    expect(isTerminal("invoiced")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("completed")).toBe(false);
    expect(isTerminal("requested")).toBe(false);
  });
});

describe("checkTransition", () => {
  it("passes a legal move", () => {
    expect(() =>
      checkTransition("scheduled", "in_progress", { appointmentCount: 1 }),
    ).not.toThrow();
    expect(() =>
      checkTransition("in_progress", "cancelled", { appointmentCount: 0 }),
    ).not.toThrow();
  });

  it("rejects every illegal move with the from/to in the message", () => {
    for (const from of JOB_STATUSES) {
      for (const to of JOB_STATUSES) {
        if (LEGAL.some(([f, t]) => f === from && t === to)) continue;
        expect(
          () => checkTransition(from, to, { appointmentCount: 5 }),
          `${from} -> ${to}`,
        ).toThrow(new InvalidTransition(`cannot move a job from ${from} to ${to}`));
      }
    }
  });

  it("never grants invoiced, even from completed", () => {
    expect(() =>
      checkTransition("completed", "invoiced", { appointmentCount: 3 }),
    ).toThrow(InvalidTransition);
  });

  it("requires an appointment before a job can be scheduled", () => {
    expect(() =>
      checkTransition("requested", "scheduled", { appointmentCount: 0 }),
    ).toThrow(
      new ValidationFailed("a job needs an appointment before it can be scheduled"),
    );
    expect(() =>
      checkTransition("requested", "scheduled", { appointmentCount: 1 }),
    ).not.toThrow();
  });
});

describe("job attachment guards", () => {
  it("accepts appointments only before completion", () => {
    expect(() => checkAcceptsAppointments("requested")).not.toThrow();
    expect(() => checkAcceptsAppointments("scheduled")).not.toThrow();
    expect(() => checkAcceptsAppointments("in_progress")).not.toThrow();
    expect(() => checkAcceptsAppointments("completed")).toThrow(
      new ValidationFailed("appointments cannot be added to a job that is completed"),
    );
    expect(() => checkAcceptsAppointments("invoiced")).toThrow(ValidationFailed);
    expect(() => checkAcceptsAppointments("cancelled")).toThrow(ValidationFailed);
  });

  it("accepts parts until the job is invoiced or cancelled", () => {
    expect(() => checkAcceptsParts("requested")).not.toThrow();
    expect(() => checkAcceptsParts("completed")).not.toThrow();
    expect(() => checkAcceptsParts("invoiced")).toThrow(
      new ValidationFailed("parts cannot be added to a job that is invoiced"),
    );
    expect(() => checkAcceptsParts("cancelled")).toThrow(
      new ValidationFailed("parts cannot be added to a job that is cancelled"),
    );
  });
});
