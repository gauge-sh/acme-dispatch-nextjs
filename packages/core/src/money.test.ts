import { describe, expect, it } from "vitest";

import { divideRounded, toSafeCents } from "./money";

describe("divideRounded", () => {
  it("divides exactly when there is no remainder", () => {
    expect(divideRounded(400n, 4n)).toBe(100n);
    expect(divideRounded(0n, 7n)).toBe(0n);
  });

  it("rounds a half away from zero, both signs", () => {
    expect(divideRounded(5n, 2n)).toBe(3n);
    expect(divideRounded(-5n, 2n)).toBe(-3n);
    expect(divideRounded(15n, 10n)).toBe(2n);
    expect(divideRounded(25n, 10n)).toBe(3n);
    expect(divideRounded(-25n, 10n)).toBe(-3n);
  });

  it("rounds below a half toward zero", () => {
    expect(divideRounded(26664n, 10n)).toBe(2666n);
    expect(divideRounded(-26664n, 10n)).toBe(-2666n);
    expect(divideRounded(14n, 10n)).toBe(1n);
  });

  it("rounds above a half away from zero", () => {
    expect(divideRounded(254067n, 10n)).toBe(25407n);
    expect(divideRounded(16n, 10n)).toBe(2n);
  });

  it("rejects a non-positive denominator", () => {
    expect(() => divideRounded(1n, 0n)).toThrow(RangeError);
    expect(() => divideRounded(1n, -2n)).toThrow(RangeError);
  });
});

describe("toSafeCents", () => {
  it("passes safe integers through", () => {
    expect(toSafeCents(25407n)).toBe(25407);
    expect(toSafeCents(-1n)).toBe(-1);
  });

  it("rejects amounts beyond safe integer range", () => {
    expect(() => toSafeCents(2n ** 53n)).toThrow(RangeError);
  });
});
