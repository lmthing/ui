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
  /** Centre the vertical scale here, with equal space above and below. Does not draw a line. */
  center?: number;
  selected?: string;
  targets?: readonly { point: string; target: Target }[];
  targetPlacement?: "below" | "marker";
  style?: "full" | "compact";
};

function centeredScale(values: readonly number[], center: number) {
  const unit = values.some((value) => !Number.isFinite(value - center)) ? 2 : 1;
  const origin = center / unit;
  const delta = (value: number) => value / unit - origin;
  const half = values.reduce((extent, value) => Math.max(extent, Math.abs(delta(value))), 0);
  return {
    ticks: half ? [(origin + half) * unit, center, (origin - half) * unit].filter(Number.isFinite) : [center],
    y: (value: number) => (half ? 0.5 - delta(value) / half / 2 : 0.5),
  };
}

function verticalScale(values: readonly number[], center: number | undefined) {
  if (center !== undefined && Number.isFinite(center)) return centeredScale(values, center);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  return {
    ticks: high === low ? [low] : [high, (high + low) / 2, low],
    y: (value: number) => (high === low ? 0.5 : 1 - (value - low) / (high - low)),
  };
}

export function plotGeometry(
  series: LinePlotProps["series"],
  goal?: LinePlotProps["goal"],
  band?: LinePlotProps["band"],
  baseline?: LinePlotProps["baseline"],
  center?: LinePlotProps["center"],
) {
  const points = series.flatMap((line) => line.points);
  const finite = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.value));
  const values = finite.map((point) => point.value!);
  if (goal && Number.isFinite(goal.value)) values.push(goal.value);
  if (baseline !== undefined && Number.isFinite(baseline)) values.push(baseline);
  const bands = plotBands(series[0]?.points ?? [], band);
  for (const run of bands) for (const point of run) values.push(point.low, point.high);
  const xs = points.filter((point) => Number.isFinite(point.x)).map((point) => point.x);
  const start = xs.length ? Math.min(...xs) : 0;
  const end = xs.length ? Math.max(...xs) : 1;
  return {
    empty: !finite.length,
    bands,
    ...verticalScale(values, center),
    first: points.find((point) => point.x === start)?.label,
    last: end === start ? undefined : points.find((point) => point.x === end)?.label,
    x: (value: number) => (end === start ? 0.5 : (value - start) / (end - start)),
  };
}

export function plotCoordinate(ratio: number, size: number, padding: number) {
  const inset = Math.min(size / 2, padding);
  return inset + ratio * (size - inset * 2);
}

export function plotTargets(series: LinePlotProps["series"], targets: LinePlotProps["targets"]) {
  if (!targets?.length) return [];
  const readings = series.flatMap((line) => line.points);
  return targets.flatMap(({ point, target }) => {
    const reading = readings.find((p) => p.id === point);
    return reading && reading.value !== null && Number.isFinite(reading.value) && Number.isFinite(reading.x)
      ? [{ point: { ...reading, value: reading.value }, target }]
      : [];
  });
}

export function nearestPlotTarget<T extends { x: number; y: number }>(
  markers: readonly T[],
  from: T,
  dx: number,
  dy: number,
  half: number,
) {
  let nearest = from;
  let best = Math.hypot(dx, dy);
  for (const marker of markers) {
    const x = from.x + dx - marker.x;
    const y = from.y + dy - marker.y;
    if (Math.abs(x) > half || Math.abs(y) > half) continue;
    const distance = Math.hypot(x, y);
    if (distance >= best) continue;
    best = distance;
    nearest = marker;
  }
  return nearest;
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
