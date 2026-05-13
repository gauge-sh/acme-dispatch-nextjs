import { describe, expect, it } from "vitest";

import { ValidationFailed } from "./errors";
import {
  FieldErrors,
  readBool,
  readEmail,
  readEnum,
  readInt,
  readString,
  readTimestamp,
} from "./validate";

function collect(run: (errors: FieldErrors) => void): Record<string, string> {
  const errors = new FieldErrors();
  run(errors);
  try {
    errors.throwIfAny();
  } catch (error) {
    if (error instanceof ValidationFailed) return error.fields;
    throw error;
  }
  return {};
}

describe("readString", () => {
  it("rejects non-string values outright", () => {
    for (const value of [42, true, ["a"], { a: 1 }]) {
      const fields = collect((errors) =>
        readString({ name: value }, "name", { max: 10 }, errors),
      );
      expect(fields["name"], String(value)).toBe("name must be a string");
    }
  });

  it("measures length after trimming", () => {
    const errors = new FieldErrors();
    expect(readString({ name: "  ab  " }, "name", { max: 2 }, errors)).toBe("ab");
    const fields = collect((e) => readString({ name: "   " }, "name", { max: 10 }, e));
    expect(fields["name"]).toBe("name must be 1-10 characters");
  });

  it("keeps the first message per field", () => {
    const errors = new FieldErrors();
    errors.add("name", "first");
    errors.add("name", "second");
    try {
      errors.throwIfAny();
    } catch (error) {
      expect((error as ValidationFailed).message).toBe("first");
      expect((error as ValidationFailed).fields).toEqual({ name: "first" });
    }
  });
});

describe("readInt", () => {
  it("rejects strings that look like numbers", () => {
    const fields = collect((e) => readInt({ n: "5" }, "n", {}, e));
    expect(fields["n"]).toBe("n must be a positive integer");
  });

  it("rejects NaN and infinities", () => {
    for (const value of [Number.NaN, Infinity, -Infinity, 1.5]) {
      const fields = collect((e) => readInt({ n: value }, "n", {}, e));
      expect(fields["n"], String(value)).toBe("n must be a positive integer");
    }
  });
});

describe("readBool", () => {
  it("rejects truthy strings", () => {
    for (const value of ["true", 1, 0]) {
      const fields = collect((e) => readBool({ b: value }, "b", {}, e));
      expect(fields["b"], String(value)).toBe("b must be true or false");
    }
  });
});

describe("readEmail", () => {
  it("trims before checking for @", () => {
    const errors = new FieldErrors();
    expect(
      readEmail({ email: "  A@B.example " }, "email", { lowercase: true }, errors),
    ).toBe("a@b.example");
  });
});

describe("readEnum", () => {
  const guard = (value: string): value is "a" | "b" => value === "a" || value === "b";

  it("uses the label in the message", () => {
    const fields = collect((e) =>
      readEnum({ kind: "c" }, "kind", { guard, label: "kind" }, e),
    );
    expect(fields["kind"]).toBe("unknown kind");
  });
});

describe("readTimestamp", () => {
  it("accepts offsets and normalizes to an instant", () => {
    const errors = new FieldErrors();
    const parsed = readTimestamp(
      { at: "2025-03-12T09:00:00+02:00" },
      "at",
      {},
      errors,
    );
    expect(parsed?.toISOString()).toBe("2025-03-12T07:00:00.000Z");
  });

  it("rejects numbers and garbage", () => {
    for (const value of [1710000000, "not a date", ""]) {
      const fields = collect((e) => readTimestamp({ at: value }, "at", {}, e));
      expect(fields["at"], String(value)).toBe("at must be an ISO-8601 timestamp");
    }
  });
});
