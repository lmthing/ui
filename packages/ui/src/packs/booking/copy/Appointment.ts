import { bookingWordsFor } from "../lang";
import { appointmentDate, wordsFor, compactMoneyLine, durationLine } from "../../../catalog";

export const { appointmentLabels } = bookingWordsFor();

/** Optional record details, in the same order on screen and in an agent's reading. */
export function appointmentDetails(
  input: {
    with?: string | undefined;
    minutes: number;
    place?: string | undefined;
    price?: number | undefined;
    policy?: string | undefined;
  },
  lang?: string,
) {
  return Object.entries({
    with: input.with,
    minutes: durationLine(input.minutes, lang),
    place: input.place,
    price: input.price !== undefined ? compactMoneyLine(input.price, undefined, lang) : undefined,
    policy: input.policy,
  }).flatMap(([part, text]) => (text ? [{ part, text }] : []));
}

export function appointmentReading(
  input: Parameters<typeof appointmentDetails>[0] & {
    date: string;
    time: string;
    style: "card" | "summary";
    status: keyof typeof appointmentLabels;
  },
  lang?: string,
): string[] {
  const { appointmentLabels } = bookingWordsFor(lang);
  return [
    appointmentDate(input.date, lang),
    input.date,
    input.time,
    ...appointmentDetails(input, lang).map((line) => line.text),
    ...(input.price !== undefined ? [String(input.price)] : []),
    ...(input.style === "card"
      ? [appointmentLabels[input.status], appointmentLabels.reschedule, wordsFor(lang).cancelLabel]
      : [appointmentLabels.edit]),
  ];
}
