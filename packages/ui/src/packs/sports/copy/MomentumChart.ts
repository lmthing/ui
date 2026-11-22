import { numberLine } from "../../../catalog";
import { sportsWordsFor } from "../lang";

type Mode = "win_prob" | "momentum";
type Point = { clock: string; value: number; event?: string | undefined };
type Reading = {
  mode: Mode;
  home: string;
  away: string;
  points: readonly Point[];
  samples: readonly (Point & { id: string })[];
};

export function momentumSummary(mode: Mode, value: number) {
  const baseline = mode === "win_prob" ? 50 : 0;
  const delta = value - baseline;
  const side = delta > 0 ? "home" : delta < 0 ? "away" : "even";
  return { baseline, delta, side } as const;
}

export function momentumReading(input: Reading, lang?: string): string[] {
  const words = sportsWordsFor(lang).momentumChart;
  const value = (point: Point) =>
    input.mode === "win_prob"
      ? new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 2 }).format(point.value / 100)
      : numberLine(point.value, lang);
  const last = input.points.at(-1)!;
  const { delta, side } = momentumSummary(input.mode, last.value);
  const advantage =
    side === "even"
      ? words.even
      : words.advantage(input[side], numberLine(Math.abs(delta), lang), input.mode);
  return [
    words.title[input.mode],
    words.current(last.clock, value(last), advantage),
    ...input.samples.map((point) => words.event(point.id, point.clock, value(point), point.event)),
  ];
}
