/** Device-local wording and calendar-day estimates, never a contraceptive prediction. */
export const cycleLabels = {
  log: "Log period",
  disclaimer: "Predictions are not a method of contraception.",
  empty: "Log a period to see cycle estimates.",
  upcoming: "Upcoming period",
  period: "Period",
  follicular: "Follicular phase",
  ovulation: "Ovulation estimate",
  luteal: "Luteal phase",
} as const;

export type CycleSeed = { start: string; length: number; period: number };
const dayMs = 24 * 60 * 60 * 1000;
const dateAt = (time: number) => new Date(time).toISOString().slice(0, 10);
const dateLine = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

/** The viewer's calendar date, not tomorrow/yesterday in a different timezone. */
export function cycleToday(now = new Date()): string {
  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Repeat the average cycle; estimate ovulation fourteen calendar days before the next period. */
export function cycleEstimate({ start, length, period }: CycleSeed, today = cycleToday()) {
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

export const cycleDayLine = (day: number): string => (day ? `Day ${day}` : "Not started");
export const cycleNextLine = (date: string): string => `Next period · ${dateLine(date)} (est.)`;
export const cycleWindowLine = (start: string, end: string): string =>
  `Fertile window (est.) · ${dateLine(start)} – ${dateLine(end)}`;

export function cycleReading(input: CycleSeed): string[] {
  const cycle = cycleEstimate(input);
  return [
    cycleDayLine(cycle.day),
    cycle.phase,
    cycleNextLine(cycle.next),
    cycleWindowLine(cycle.windowStart, cycle.windowEnd),
    cycleLabels.log,
    cycleLabels.disclaimer,
  ];
}
