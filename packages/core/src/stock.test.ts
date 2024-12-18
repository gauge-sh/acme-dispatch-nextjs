import { describe, expect, it } from "vitest";

import { InsufficientStock, ValidationFailed } from "./errors";
import { adjustStock, checkQuantity, consumeStock, releaseStock } from "./stock";

describe("adjustStock", () => {
  it("applies positive and negative deltas", () => {
    expect(adjustStock(10, 5)).toBe(15);
    expect(adjustStock(10, -10)).toBe(0);
  });

  it("rejects a delta of zero", () => {
    expect(() => adjustStock(10, 0)).toThrow(
      new ValidationFailed("delta must not be zero"),
    );
  });

  it("rejects a result below zero", () => {
    expect(() => adjustStock(3, -4)).toThrow(
      new InsufficientStock("not enough stock on hand"),
    );
    expect(() => adjustStock(0, -1)).toThrow(InsufficientStock);
  });
});

describe("consumeStock", () => {
  it("draws down to exactly zero", () => {
    expect(consumeStock(4, 4)).toBe(0);
  });

  it("rejects more than is on hand", () => {
    expect(() => consumeStock(4, 5)).toThrow(InsufficientStock);
  });

  it("rejects a non-positive quantity", () => {
    expect(() => consumeStock(4, 0)).toThrow(
      new ValidationFailed("quantity must be greater than zero"),
    );
    expect(() => consumeStock(4, -2)).toThrow(ValidationFailed);
  });
});

describe("releaseStock", () => {
  it("returns quantity to the shelf", () => {
    expect(releaseStock(0, 3)).toBe(3);
  });

  it("rejects a non-positive quantity", () => {
    expect(() => releaseStock(4, 0)).toThrow(ValidationFailed);
  });
});

describe("checkQuantity", () => {
  it("accepts one and up", () => {
    expect(() => checkQuantity(1)).not.toThrow();
    expect(() => checkQuantity(250)).not.toThrow();
  });
});
