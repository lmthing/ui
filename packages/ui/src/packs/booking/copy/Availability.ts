import { appointmentDate, durationLine, wordsFor } from "../../../catalog";
import { bookingWordsFor } from "../lang";
/** Neutral working-week defaults and labels for paired time controls. */
export const availabilityDefaults = { from: "09:00", to: "17:00" } as const;
export const { availabilityLabels } = bookingWordsFor();
export const breakLine = (from: string, to: string, lang?: string): string =>
  `${bookingWordsFor(lang).availabilityLabels.break} ${from}–${to}`;

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
  const { weekdayNames } = wordsFor(lang);
  const { availabilityLabels, availabilityOverrides } = bookingWordsFor(lang);
  return [
    ...weekdayNames,
    availabilityLabels.from,
    availabilityLabels.to,
    ...days.flatMap(({ from, to, breakFrom, breakTo }) => [
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
