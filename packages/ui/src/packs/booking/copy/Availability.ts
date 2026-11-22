import { appointmentDate, durationLine, wordsFor } from "../../../catalog";
import { bookingWordsFor } from "../lang";
/** Neutral working-week defaults and labels for paired time controls. */
export const availabilityDefaults = { from: "09:00", to: "17:00" } as const;
export const { availabilityLabels } = bookingWordsFor();
export const bookingWeekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Weekday = (typeof bookingWeekdays)[number];

export function availabilityDayLabel(day: Weekday, on: boolean, lang?: string) {
  const weekday = wordsFor(lang).weekdayNames[bookingWeekdays.indexOf(day)]!;
  return on ? weekday : bookingWordsFor(lang).availabilityLabels.off(weekday);
}

export const breakRange = (from: string, to: string): string => `${from}–${to}`;
export const breakLine = (from: string, to: string, lang?: string): string =>
  `${bookingWordsFor(lang).availabilityLabels.break} ${breakRange(from, to)}`;

export const bufferLine = (minutes: number, lang?: string): string =>
  bookingWordsFor(lang).availabilityBuffer(durationLine(minutes, lang));

type OverrideKind = "blocked" | "holiday";
export function dateOverrideLine(date: string, kind: OverrideKind, lang?: string): string {
  return `${appointmentDate(date, lang)} · ${bookingWordsFor(lang).availabilityOverride[kind]}`;
}

export function availabilityReading(
  {
    days,
    bufferMinutes,
    dateOverrides,
  }: {
    days: readonly {
      day: Weekday;
      on: boolean;
      from: string;
      to: string;
      breakFrom?: string | undefined;
      breakTo?: string | undefined;
    }[];
    bufferMinutes?: number | undefined;
    dateOverrides?: readonly { date: string; kind: OverrideKind }[] | undefined;
  },
  lang?: string,
) {
  const { availabilityLabels, availabilityOverrides } = bookingWordsFor(lang);
  return [
    availabilityLabels.from,
    availabilityLabels.to,
    ...days.flatMap(({ day, on, from, to, breakFrom, breakTo }) => [
      availabilityDayLabel(day, on, lang),
      from,
      to,
      ...(breakFrom && breakTo ? [breakLine(breakFrom, breakTo, lang)] : []),
    ]),
    ...(bufferMinutes === undefined ? [] : [bufferLine(bufferMinutes, lang)]),
    ...(dateOverrides?.length
      ? [availabilityOverrides, ...dateOverrides.map(({ date, kind }) => dateOverrideLine(date, kind, lang))]
      : []),
  ];
}
