export const measurementLabels = {
  add: "Add measurement",
  ranges: "Time range",
  month: "Month",
  quarter: "3 months",
  year: "Year",
  start: "Start",
  latest: "Latest",
} as const;

export type MeasurementRange = "month" | "quarter" | "year";
export const measurementRanges = ["month", "quarter", "year"] as const;

/** The shared track sends display labels; agent actions can use the wire enum. */
export function measurementRange(value: unknown, fallback: MeasurementRange): MeasurementRange {
  return measurementRanges.find((range) => value === range || value === measurementLabels[range]) ?? fallback;
}

const numberLine = (value: number) => String(Number(value.toFixed(3)));

/** No health judgement: signed change always compares with the first supplied reading. */
export function measurementCopy(points: readonly number[], unit: string, goal?: number) {
  const latest = points.at(-1)!;
  const change = latest - points[0]!;
  return {
    latest: numberLine(latest),
    latestLabel: `${measurementLabels.latest} · ${unit}`,
    change: `${change > 0 ? "+" : ""}${numberLine(change)} ${unit} since first reading`,
    goal: goal === undefined ? undefined : `Goal ${numberLine(goal)} ${unit}`,
  };
}

/** Weekly samples have bounded month/quarter/year windows; do not invent calendar dates. */
export function measurementPoints(points: readonly number[], range: MeasurementRange) {
  const count = { month: 4, quarter: 13, year: 52 }[range];
  const window = points.slice(-count);
  return window.map((value, index) => ({
    id: `p${points.length - window.length + index + 1}`,
    x: index,
    value,
    label: index === 0 ? measurementLabels.start : measurementLabels.latest,
  }));
}

export function measurementReading(points: readonly number[], unit: string, goal?: number): string[] {
  const copy = measurementCopy(points, unit, goal);
  return [
    `${copy.latest} ${unit}`,
    copy.latestLabel,
    copy.change,
    ...(copy.goal ? [copy.goal] : []),
    ...measurementRanges.map((range) => measurementLabels[range]),
    measurementLabels.start,
    measurementLabels.latest,
    measurementLabels.add,
  ];
}
