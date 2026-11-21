import { numberLine } from "../../../catalog";
import { dataWordsFor } from "../lang";

type Chart = {
  labels: readonly string[];
  series: readonly { label: string; values: readonly number[] }[];
};

export const seriesTones = ["accent", "text", "warn"] as const;
export const seriesId = (line: number) => `s${line + 1}`;

export function chartPoints({ labels, series }: Chart) {
  return series.flatMap(({ label: series, values }, line) =>
    values.map((value, x) => ({
      id: `r${line * labels.length + x + 1}`,
      line,
      x,
      series,
      label: labels[x]!,
      value,
    })),
  );
}

export function pointValue(value: number, unit?: string, lang?: string): string {
  const line = numberLine(value, lang);
  return unit ? dataWordsFor(lang).chartValue(line, unit) : line;
}

export function pointReading(point: ReturnType<typeof chartPoints>[number], unit?: string, lang?: string) {
  const { id, series, label, value } = point;
  return dataWordsFor(lang).chartReading(id, series, label, pointValue(value, unit, lang));
}

/** Match KitLinePlot's endpoint and midpoint ticks in the data-only reading. */
export function chartTicks(points: readonly { value: number }[], lang?: string): string[] {
  const values = points.map(({ value }) => value);
  const low = Math.min(...values),
    high = Math.max(...values);
  return (low === high ? [low] : [high, (high + low) / 2, low]).map((tick) =>
    numberLine(Number(tick.toPrecision(4)), lang),
  );
}
