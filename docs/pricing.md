# Pricing

Everything below is implemented in `packages/core/src/pricing.ts` and pinned
by the fixtures in `packages/core/testdata/pricing-cases.json`. Money is
always an integer count of cents; no step ever holds a fractional cent.

## Labor

Each appointment on the job produces one labor line:

```
hours × technician hourly cost × 1.6
```

Hours come from the exact appointment duration — a 20-minute visit bills one
third of an hour, not a rounded 0.33. The product is rounded to whole cents,
half away from zero.

If the appointment **starts** on a Saturday or Sunday in UTC, the
already-rounded line is multiplied by 1.15 and rounded again. The surcharge
is per appointment: a job with a Wednesday visit and a Sunday visit
surcharges only the Sunday line.

## Parts

Each usage record produces one part line: `quantity × unit price`, using the
price captured when the part was recorded on the job. Both factors are whole
numbers, so there is nothing to round. Later catalog price changes never
restate an existing line.

## Total

```
total = labor lines + part lines
```

If the job's priority is `urgent`, the total is multiplied by 1.10 and
rounded — applied last, to the total only, never to individual lines. `low`
and `normal` add nothing.

## Rounding

Round half away from zero, to whole cents, after each labor line and after
the urgent multiplier. Not banker's rounding, and not JavaScript's
`Math.round` (which sends -0.5 toward positive infinity). The implementation
does exact integer ratio division in `packages/core/src/money.ts`.

Worked examples, from the fixtures:

- 0.5h × 3333¢ × 1.6 = 2666.4 → **2666**
- 2h × 5000¢ × 1.6 = 16000; Saturday: 16000 × 1.15 = 18400 → **18400**
- labor 19200 + parts 3897 = 23097; urgent: 23097 × 1.1 = 25406.7 → **25407**

## Line ordering

Labor lines first, ordered by scheduled start then appointment id; then part
lines ordered by usage id. The invoice record stores the lines in this order
and they are immutable once written.
