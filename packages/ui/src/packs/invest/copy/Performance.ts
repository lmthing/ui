import {
  changeLine,
  compactMoneyLine,
  dateLocaleOf,
  defaultCurrency,
  type AppCurrency,
} from "../../../catalog";
import { investWordsFor } from "../lang";

export type PerformancePoint = {
  id: string;
  at: string;
  value?: number | null;
  contributed?: number | null;
  gain?: number | null;
};

export const performanceRanges = ["all", "month", "year"] as const;
export const performanceChoices = performanceRanges.map((value) => ({
  value,
  label: investWordsFor().performance.ranges[value],
}));

export function performancePointCopy(point: PerformancePoint, lang?: string, currency?: AppCurrency) {
  const words = investWordsFor(lang).performance;
  const date = new Date(point.at);
  const locale = dateLocaleOf(lang);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options }).format(date);
  const money = (amount: number | null | undefined) =>
    typeof amount === "number" && Number.isFinite(amount)
      ? compactMoneyLine(amount, currency, lang)
      : words.unknown;
  const gain = point.gain;
  return {
    day: format({ month: "short", day: "numeric" }),
    at: format({
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }),
    value: money(point.value),
    contributed: money(point.contributed),
    gain:
      typeof gain === "number" && Number.isFinite(gain)
        ? changeLine(gain, "money", currency, lang)
        : words.unknown,
    tone: !gain ? "muted" : gain > 0 ? "good" : "bad",
  } as const;
}

export function performanceReading(
  {
    samples,
    detail,
    selected_point,
  }: { samples: readonly PerformancePoint[]; detail?: string; selected_point?: string },
  lang?: string,
  currency?: AppCurrency,
) {
  const words = investWordsFor(lang).performance;
  const rows = samples.map((point) => {
    const copy = performancePointCopy(point, lang, currency);
    return `${point.id}: ${words.reading(copy.at, copy.value, copy.contributed, copy.gain)} (${point.at}) ${copy.day}`;
  });
  const point = samples.find(({ at }) => at === selected_point) ?? samples.at(-1);
  if (!point) return rows;
  const copy = performancePointCopy(point, lang, currency);
  return [
    words.value,
    words.contributed,
    words.gain,
    words.observations,
    ...(detail !== "brief" ? [selected_point === point.at ? words.selected : words.latest] : []),
    ...rows,
    ...(samples.some(({ contributed }) => typeof contributed === "number")
      ? [currency ?? defaultCurrency]
      : []),
    ...axisReadings(samples, words),
  ];
}

function axisReadings(
  samples: readonly PerformancePoint[],
  words: ReturnType<typeof investWordsFor>["performance"],
) {
  const amounts = samples.flatMap(({ value, contributed }) =>
    [value, contributed].filter((n): n is number => typeof n === "number" && Number.isFinite(n)),
  );
  if (!amounts.length) return [words.unavailable];
  const low = Math.min(...amounts),
    high = Math.max(...amounts);
  return (low === high ? [low] : [high, (low + high) / 2, low]).map((value) =>
    String(Number(value.toPrecision(4))),
  );
}
