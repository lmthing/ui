import { numberLine } from "../../../catalog";
import { sportsWordsFor } from "../lang";

type Mode = "win_prob" | "momentum";
type Point = { clock: string; value: number; event?: string | undefined };
type Match = {
  mode: Mode;
  home: string;
  away: string;
};
type Reading = Match & {
  points: readonly Point[];
  samples: readonly (Point & { id: string; selected?: boolean })[];
};

export function momentumSummary(mode: Mode, value: number) {
  const baseline = mode === "win_prob" ? 50 : 0;
  const delta = value - baseline;
  const side = delta > 0 ? "home" : delta < 0 ? "away" : "even";
  return { baseline, delta, side } as const;
}

export function momentumValue(mode: Mode, value: number, lang?: string): string {
  return mode === "win_prob"
    ? new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 2 }).format(value / 100)
    : numberLine(value, lang);
}

export function momentumFigure(input: Match, point: Point, lang?: string) {
  const words = sportsWordsFor(lang).momentumChart;
  const { delta, side } = momentumSummary(input.mode, point.value);
  const advantage =
    side === "even"
      ? words.even
      : words.advantage(input[side], numberLine(Math.abs(delta), lang), input.mode);
  return { value: momentumValue(input.mode, point.value, lang), advantage };
}

export function momentumExtent(mode: Mode, points: readonly Pick<Point, "value">[]): number {
  return points.reduce(
    (extent, { value }) => Math.max(extent, Math.abs(momentumSummary(mode, value).delta)),
    0,
  );
}

export function selectedEvent<T extends Point & { selected?: boolean }>(samples: readonly T[]) {
  let latest: T | undefined;
  for (const point of samples) {
    if (!point.event) continue;
    if (point.selected) return point;
    latest = point;
  }
  return latest;
}

function elapsedMinute(clock: string) {
  const match = /^(\d{1,3})(?:\+(\d{1,2}))?[′']?$/.exec(clock);
  return match ? Number(match[1]) + Number(match[2] ?? 0) : NaN;
}

/** Unstructured or restarting clocks preserve feed order instead of implying elapsed time. */
export function momentumTimes(samples: readonly Pick<Point, "clock">[]): number[] {
  const minutes = samples.map(({ clock }) => elapsedMinute(clock));
  return minutes.every((minute, index) => Number.isFinite(minute) && (!index || minute > minutes[index - 1]!))
    ? minutes
    : samples.map((_, index) => index);
}

export function momentumReading(input: Reading, lang?: string): string[] {
  const words = sportsWordsFor(lang).momentumChart;
  const last = input.points.at(-1)!;
  const { value, advantage } = momentumFigure(input, last, lang);
  const active = selectedEvent(input.samples);
  return [
    words.title[input.mode],
    words.current(last.clock, value, advantage),
    ...(active ? [words.selected(active.id)] : []),
    ...input.samples.map((point) =>
      words.event(point.id, point.clock, momentumValue(input.mode, point.value, lang), point.event),
    ),
  ];
}
