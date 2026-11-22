import type { TextTone } from "../text";

export type Point = { id: string; x: number; value: number | null; label: string };
export type Target = { item?: string; part: string };
export type LinePlotProps = {
  part?: string;
  loading?: boolean;
  series: readonly { id: string; label: string; tone?: TextTone; points: readonly Point[] }[];
  unit?: string;
  goal?: { value: number; label: string };
  band?: { low: readonly number[]; high: readonly number[] };
  baseline?: number;
  selected?: string;
  targets?: readonly { point: string; target: Target }[];
  style?: "full" | "compact";
};

export function plotGeometry(
  series: LinePlotProps["series"],
  goal?: LinePlotProps["goal"],
  band?: LinePlotProps["band"],
  baseline?: LinePlotProps["baseline"],
) {
  const points = series.flatMap((line) => line.points);
  const finite = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.value));
  const values = finite.map((point) => point.value!);
  if (goal && Number.isFinite(goal.value)) values.push(goal.value);
  if (baseline !== undefined && Number.isFinite(baseline)) values.push(baseline);
  const bands = plotBands(series[0]?.points ?? [], band);
  for (const run of bands) for (const point of run) values.push(point.low, point.high);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  const xs = points.filter((point) => Number.isFinite(point.x)).map((point) => point.x);
  const start = xs.length ? Math.min(...xs) : 0;
  const end = xs.length ? Math.max(...xs) : 1;
  return {
    empty: !finite.length,
    bands,
    ticks: high === low ? [low] : [high, (high + low) / 2, low],
    first: points.find((point) => point.x === start)?.label,
    last: end === start ? undefined : points.find((point) => point.x === end)?.label,
    x: (value: number) => (end === start ? 0.5 : (value - start) / (end - start)),
    y: (value: number) => (high === low ? 0.5 : 1 - (value - low) / (high - low)),
  };
}

type BandPoint = { x: number; low: number; high: number };
function plotBands(points: readonly Point[], band: LinePlotProps["band"]) {
  const runs: BandPoint[][] = [];
  if (!band) return runs;
  let current: BandPoint[] = [];
  for (const [i, { x }] of points.entries()) {
    const low = band.low[i];
    const high = band.high[i];
    if (low === undefined || high === undefined || ![low, high, x].every(Number.isFinite) || low > high) {
      current = [];
      continue;
    }
    if (!current.length) runs.push(current);
    current.push({ x, low, high });
  }
  return runs.filter((run) => run.length > 1);
}

export function bandPath(run: readonly BandPoint[], x: (n: number) => number, y: (n: number) => number) {
  if (run.length < 2) return "";
  const edge = (point: BandPoint, side: "low" | "high") => `${x(point.x)},${y(point[side])}`;
  const boundary = [
    ...run.map((point) => edge(point, "high")),
    ...[...run].reverse().map((point) => edge(point, "low")),
  ];
  return `M${boundary.join(" L")} Z`;
}

export function plotPaths(points: readonly Point[], x: (n: number) => number, y: (n: number) => number) {
  let connected = false;
  return points
    .map((point) => {
      if (point.value === null || !Number.isFinite(point.value) || !Number.isFinite(point.x)) {
        connected = false;
        return "";
      }
      const command = `${connected ? "L" : "M"}${x(point.x)},${y(point.value)}`;
      connected = true;
      return command;
    })
    .filter(Boolean)
    .join(" ");
}
