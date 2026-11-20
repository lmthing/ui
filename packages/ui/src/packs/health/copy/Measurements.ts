import { numberLine } from "../../../catalog";
import { healthWordsFor } from "../lang";
export const { measurementLabels } = healthWordsFor();

export type MeasurementRange = "month" | "quarter" | "year";
export const measurementRanges = ["month", "quarter", "year"] as const;

/** The shared track sends display labels; agent actions can use the wire enum. */
export function measurementRange(
  value: unknown,
  fallback: MeasurementRange,
  lang?: string,
): MeasurementRange {
  const { measurementLabels } = healthWordsFor(lang);
  return measurementRanges.find((range) => value === range || value === measurementLabels[range]) ?? fallback;
}

const measured = (value: number, lang?: string) => numberLine(Number(value.toFixed(3)), lang);

/** No health judgement: signed change always compares with the first supplied reading. */
export function measurementCopy(points: readonly number[], unit: string, goal?: number, lang?: string) {
  const { measurementLabels, measurementChange, measurementGoal, measurementLatest } = healthWordsFor(lang);
  const latest = points.at(-1)!;
  const change = latest - points[0]!;
  return {
    latest: measured(latest, lang),
    latestLabel: measurementLatest(measurementLabels.latest, unit),
    change: measurementChange(`${change > 0 ? "+" : ""}${measured(change, lang)}`, unit),
    goal: goal === undefined ? undefined : measurementGoal(measured(goal, lang), unit),
  };
}

/** Weekly samples have bounded month/quarter/year windows; do not invent calendar dates. */
export function measurementPoints(points: readonly number[], range: MeasurementRange, lang?: string) {
  const { measurementLabels } = healthWordsFor(lang);
  const count = { month: 4, quarter: 13, year: 52 }[range];
  const window = points.slice(-count);
  return window.map((value, index) => ({
    id: `p${points.length - window.length + index + 1}`,
    x: index,
    value,
    label: index === 0 ? measurementLabels.start : measurementLabels.latest,
  }));
}

export function measurementReading(
  points: readonly number[],
  unit: string,
  goal?: number,
  lang?: string,
  showChange = true,
): string[] {
  const { measurementLabels, measurementValue } = healthWordsFor(lang);
  const copy = measurementCopy(points, unit, goal, lang);
  return [
    measurementValue(copy.latest, unit),
    copy.latestLabel,
    ...(showChange ? [copy.change] : []),
    ...(copy.goal ? [copy.goal] : []),
    ...measurementRanges.map((range) => measurementLabels[range]),
    measurementLabels.start,
    measurementLabels.latest,
    measurementLabels.add,
  ];
}
