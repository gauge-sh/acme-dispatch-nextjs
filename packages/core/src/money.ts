/**
 * Integer division rounded to the nearest whole, halves away from zero.
 *
 * All invoice math funnels through here: amounts stay exact integers at every
 * step, so no float and no fractional cent can drift a total. Math.round is
 * not a substitute — it rounds -0.5 up to -0, toward positive infinity.
 */
export function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new RangeError("denominator must be positive");
  }
  const negative = numerator < 0n;
  const n = negative ? -numerator : numerator;
  const quotient = n / denominator;
  const remainder = n % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

export function toSafeCents(value: bigint): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`amount overflows safe integer cents: ${value}`);
  }
  return n;
}
