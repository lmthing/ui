import { changeLine, compactMoneyLine } from "../../../catalog";
import { moneyWordsFor } from "../lang";

export const priceChartRanges = ["day", "week", "month", "year", "all"] as const;
type PriceChartRange = (typeof priceChartRanges)[number];

export function priceChartRange(value: unknown, fallback: PriceChartRange, lang?: string): PriceChartRange {
  const { options } = moneyWordsFor(lang).priceChart;
  return priceChartRanges.find((range) => value === range || value === options[range]) ?? fallback;
}

export function priceChartCopy(points: readonly number[], lang?: string) {
  const latest = points.at(-1)!;
  const delta = latest - points[0]!;
  const { change, compactChange } = moneyWordsFor(lang).priceChart;
  const amount =
    Math.abs(delta) < 10000
      ? changeLine(delta, "money", undefined, lang)
      : compactChange(compactMoneyLine(Math.abs(delta), undefined, lang), delta < 0);
  return { price: compactMoneyLine(latest, undefined, lang), change: change(amount) };
}

/** These are the samples for the supplied range, not dated points or data for the other ranges. */
export function priceChartPoints(points: readonly number[], lang?: string) {
  const { start, latest } = moneyWordsFor(lang).priceChart;
  const max = Math.max(...points);
  // Compact plots have no numeric axis. Scale extreme values before the base adds its tick endpoints.
  const scale = max > Number.MAX_VALUE / 2 ? max : 1;
  return points.map((value, index) => ({
    id: `p${index + 1}`,
    x: index,
    value: value / scale,
    label: index === 0 ? start : index === points.length - 1 ? latest : "",
  }));
}

export function priceChartReading(points: readonly number[], lang?: string, detail = "full"): string[] {
  const { price, change } = priceChartCopy(points, lang);
  const { start, latest, series, options } = moneyWordsFor(lang).priceChart;
  return [
    price,
    ...(detail === "full" ? [change] : []),
    start,
    latest,
    series,
    ...priceChartRanges.map((range) => options[range]),
  ];
}
