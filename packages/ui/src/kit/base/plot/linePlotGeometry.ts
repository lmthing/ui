import type { TextTone } from "../text";

export type Point = { id: string; x: number; value: number | null; label: string };
export type Target = { item?: string; part: string };
export type LinePlotProps = {
  part?: string;
  loading?: boolean;
  series: readonly { id: string; label: string; tone?: TextTone; points: readonly Point[] }[];
  unit?: string;
  goal?: { value: number; label: string };
  selected?: string;
  targets?: readonly { point: string; target: Target }[];
  style?: "full" | "compact";
};

export function plotGeometry(series: LinePlotProps["series"], goal?: LinePlotProps["goal"]) {
  const points = series.flatMap((line) => line.points);
  const finite = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.value));
  const values = finite.map((point) => point.value!);
  if (goal && Number.isFinite(goal.value)) values.push(goal.value);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  const xs = points.filter((point) => Number.isFinite(point.x)).map((point) => point.x);
  const start = xs.length ? Math.min(...xs) : 0;
  const end = xs.length ? Math.max(...xs) : 1;
  return {
    empty: !finite.length,
    ticks: [high, (high + low) / 2, low],
    first: points.find((point) => point.x === start)?.label,
    last: points.find((point) => point.x === end)?.label,
    x: (value: number) => (end === start ? 0.5 : (value - start) / (end - start)),
    y: (value: number) => (high === low ? 0.5 : 1 - (value - low) / (high - low)),
  };
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
