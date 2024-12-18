import { InsufficientStock, ValidationFailed } from "./errors";

/**
 * The quantity a stock level should hold after `delta` is applied. A rejected
 * adjustment writes nothing because there is nothing to write — the caller
 * persists the returned value or nothing at all.
 */
export function adjustStock(quantityOnHand: number, delta: number): number {
  if (delta === 0) {
    throw new ValidationFailed("delta must not be zero");
  }
  const result = quantityOnHand + delta;
  if (result < 0) {
    throw new InsufficientStock("not enough stock on hand");
  }
  return result;
}

export function checkQuantity(quantity: number): void {
  if (quantity < 1) {
    throw new ValidationFailed("quantity must be greater than zero");
  }
}

export function consumeStock(quantityOnHand: number, quantity: number): number {
  checkQuantity(quantity);
  return adjustStock(quantityOnHand, -quantity);
}

export function releaseStock(quantityOnHand: number, quantity: number): number {
  checkQuantity(quantity);
  return adjustStock(quantityOnHand, quantity);
}
