import { dateLocaleOf } from "../../../catalog";
import { mindWordsFor } from "../lang";

export function entryMonth(date: string, lang?: string): string {
  return new Intl.DateTimeFormat(dateLocaleOf(lang), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Input is already ordered by the schema. Preserve the item ids and order within each month. */
export function entryMonths<T extends { date: string }>(entries: readonly T[]) {
  const months: { month: string; entries: T[] }[] = [];
  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    const last = months.at(-1);
    if (last?.month === month) last.entries.push(entry);
    else months.push({ month, entries: [entry] });
  }
  return months;
}

export function entryTags(tags: readonly string[], lang?: string): string {
  return mindWordsFor(lang).entryTags(tags);
}
