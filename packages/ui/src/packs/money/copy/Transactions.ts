import { changeLine, compactMoneyLine, dateLocaleOf, defaultLang, localeOf } from "../../../catalog";
import { moneyWordsFor } from "../lang";

type Dated = { date: string };
type Transaction = Dated & { id?: string; payee: string; category: string; amount: number };

/** Newest days first, preserving the authored order and item addresses within each day. */
export function transactionGroups<T extends Dated>(entries: readonly T[]) {
  const byDay = new Map<string, T[]>();
  for (const entry of entries) {
    const day = byDay.get(entry.date);
    if (day) day.push(entry);
    else byDay.set(entry.date, [entry]);
  }
  return [...byDay.keys()]
    .sort()
    .reverse()
    .map((date) => ({ date, entries: byDay.get(date)! }));
}

export function transactionDay(date: string, lang?: string, now = new Date()): string {
  const words = moneyWordsFor(lang).transactions;
  // Compare calendar days in the viewer's time zone, not elapsed 24-hour intervals.
  const localDay = (offset: number) =>
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offset)).toISOString().slice(0, 10);
  if (date === localDay(0)) return words.today;
  if (date === localDay(-1)) return words.yesterday;
  const storedDay = new Date(`${date}T00:00:00Z`);
  const format = new Intl.DateTimeFormat(dateLocaleOf(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  if (localeOf(lang) !== defaultLang) return format.format(storedDay);
  const parts = format.formatToParts(storedDay);
  const part = (key: Intl.DateTimeFormatPartTypes) => parts.find(({ type }) => type === key)?.value ?? "";
  return words.date(part("weekday"), part("day"), part("month"));
}

export function transactionAmount(amount: number, lang?: string): string {
  const magnitude = Math.abs(amount);
  if (magnitude < 1e7) return changeLine(amount, "money", undefined, lang);
  return `${amount < 0 ? "-" : "+"}${compactMoneyLine(magnitude, undefined, lang)}`;
}

export function transactionReading(
  entries: readonly Transaction[],
  lang?: string,
  now = new Date(),
): string[] {
  const words = moneyWordsFor(lang).transactions;
  return transactionGroups(entries).flatMap(({ date, entries }) => [
    transactionDay(date, lang, now),
    ...entries.map(({ id, payee, category, amount }) => {
      const line = words.entry(payee, category, transactionAmount(amount, lang));
      return id ? `${id} ${line}` : line;
    }),
  ]);
}
