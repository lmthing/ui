import { dateFormatter, numberLine } from "../../../catalog";
import { healthWordsFor } from "../lang";
/** Device-local wording and calendar-day estimates, never a contraceptive prediction. */
export const { cycleLabels } = healthWordsFor();

export type CycleSeed = { start: string; length: number; period: number };
type CycleOptions = {
  detail?: "full" | "brief";
  mode?: "track" | "conceive" | "pregnancy";
  symptoms?: { goto: string } | undefined;
};
const dayMs = 24 * 60 * 60 * 1000;
const dateAt = (time: number) => new Date(time).toISOString().split("T")[0]!;
const atMidnight = (date: string) => new Date(`${date}T00:00:00Z`);
const keepTogether = (line: string) => line.replace(/\s/g, "\u00a0");
const dateLine = (date: string, lang?: string) => keepTogether(dateFormatter(lang).format(atMidnight(date)));

/** The viewer's calendar date, not tomorrow/yesterday in a different timezone. */
export function cycleToday(now = new Date()): string {
  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Repeat the average cycle; estimate ovulation fourteen calendar days before the next period. */
export function cycleEstimate({ start, length, period }: CycleSeed, today = cycleToday(), lang?: string) {
  const { cycleLabels } = healthWordsFor(lang);
  const origin = Date.parse(`${start}T00:00:00Z`);
  const elapsed = Math.round((Date.parse(`${today}T00:00:00Z`) - origin) / dayMs);
  const anchor = origin + Math.max(0, Math.floor(elapsed / length)) * length * dayMs;
  const day = elapsed < 0 ? 0 : (elapsed % length) + 1;
  const ovulation = length - 13;
  const phase = !day
    ? cycleLabels.upcoming
    : day <= period
      ? cycleLabels.period
      : day < ovulation
        ? cycleLabels.follicular
        : day === ovulation
          ? cycleLabels.ovulation
          : cycleLabels.luteal;
  return {
    day,
    phase,
    fertileFrom: ovulation - 5,
    fertileTo: ovulation,
    next: dateAt(day ? anchor + length * dayMs : origin),
    windowStart: dateAt(anchor + (ovulation - 6) * dayMs),
    windowEnd: dateAt(anchor + (ovulation - 1) * dayMs),
  };
}

export const cycleDayLine = (day: number, lang?: string): string =>
  day ? healthWordsFor(lang).cycleDay(numberLine(day, lang)) : healthWordsFor(lang).cycleNotStarted;
export const cycleNextLine = (date: string, lang?: string): string =>
  healthWordsFor(lang).cycleNext(dateLine(date, lang));
export const cycleWindowLine = (start: string, end: string, lang?: string): string =>
  healthWordsFor(lang).cycleWindow(
    keepTogether(dateFormatter(lang).formatRange(atMidnight(start), atMidnight(end))).replace(
      /–/g,
      "\u2060–\u2060",
    ),
  );

export function cycleReading(input: CycleSeed & CycleOptions, lang?: string): string[] {
  const { cycleLabels } = healthWordsFor(lang);
  const symptoms = input.symptoms ? [cycleLabels.symptoms] : [];
  if (input.mode === "pregnancy") return [cycleLabels.pregnancy, cycleLabels.pregnancyDetail, ...symptoms];
  const cycle = cycleEstimate(input, undefined, lang);
  return [
    ...(input.mode === "conceive" ? [cycleLabels.conceive] : []),
    cycleDayLine(cycle.day, lang),
    cycle.phase,
    ...(input.detail === "brief"
      ? []
      : [cycleNextLine(cycle.next, lang), cycleWindowLine(cycle.windowStart, cycle.windowEnd, lang)]),
    cycleLabels.log,
    ...symptoms,
    cycleLabels.disclaimer,
  ];
}
