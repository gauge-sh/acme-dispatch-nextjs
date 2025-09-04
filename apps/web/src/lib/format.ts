const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCents(cents: number): string {
  return money.format(cents / 100);
}

// All times in the product are UTC; formatting pins the zone so a server's
// locale never changes what staff see.
const dateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateOnly = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const timeOnly = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDateTime(value: Date): string {
  return `${dateTime.format(value)} UTC`;
}

export function formatDate(value: Date): string {
  return dateOnly.format(value);
}

export function formatTime(value: Date): string {
  return timeOnly.format(value);
}

/** For datetime-local inputs, which want YYYY-MM-DDTHH:MM. */
export function toInputValue(value: Date): string {
  return value.toISOString().slice(0, 16);
}

export function formatHoursBetween(start: Date, end: Date): string {
  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  return `${Math.round(hours * 100) / 100}h`;
}
