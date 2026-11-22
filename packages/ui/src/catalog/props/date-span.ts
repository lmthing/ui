import { isoDate } from "./date";

const dayMs = 86_400_000;
const largestMinimum = 30;
export type DateSpan = { start?: string; end?: string };

export function dateOrdinal(date: unknown) {
  const parsed = isoDate.safeParse(date);
  return parsed.success ? Date.parse(parsed.data) / dayMs : undefined;
}

/** The source must include every available date, including both endpoints. */
export function dateSpanNights(start: unknown, end: unknown, available: ReadonlySet<number>, minimum = 1) {
  if (!Number.isInteger(minimum) || minimum < 1 || minimum > largestMinimum) return;
  const first = dateOrdinal(start);
  const last = dateOrdinal(end);
  if (first === undefined || last === undefined) return;
  const nights = last - first;
  if (nights < minimum || nights >= available.size) return;
  for (let day = first; day <= last; day++) if (!available.has(day)) return;
  return nights;
}
