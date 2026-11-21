import { bookingWordsFor, type BookingWords } from "../lang";
import { appointmentDate, wordsFor, compactMoneyLine, durationLine, timeOfDayLine } from "../../../catalog";

export const { appointmentLabels } = bookingWordsFor();

export function appointmentCanJoin(status: string, locationKind?: string, meetingUrl?: string) {
  return (
    status === "confirmed" && Boolean(meetingUrl) && (locationKind === "video" || locationKind === undefined)
  );
}

/** Optional record details, in the same order on screen and in an agent's reading. */
export function appointmentDetails(
  input: {
    with?: string | undefined;
    minutes: number;
    place?: string | undefined;
    locationKind?: keyof BookingWords["appointmentLocation"] | undefined;
    price?: number | undefined;
    policy?: string | undefined;
  },
  lang?: string,
) {
  return Object.entries({
    with: input.with,
    minutes: durationLine(input.minutes, lang),
    place: input.place,
    locationKind: input.locationKind && bookingWordsFor(lang).appointmentLocation[input.locationKind],
    price: input.price !== undefined ? compactMoneyLine(input.price, undefined, lang) : undefined,
    policy: input.policy,
  }).flatMap(([part, text]) => (text ? [{ part, text }] : []));
}

export function appointmentReading(
  input: Parameters<typeof appointmentDetails>[0] & {
    date: string;
    time: string;
    style: "card" | "summary" | "compact";
    status: keyof BookingWords["appointmentLabels"];
    meetingUrl?: string | undefined;
  },
  lang?: string,
): string[] {
  const { appointmentLabels, appointmentJoin, appointmentLocation } = bookingWordsFor(lang);
  const compact = input.style === "compact";
  const location = input.locationKind && appointmentLocation[input.locationKind];
  return [
    appointmentDate(input.date, lang),
    input.date,
    timeOfDayLine(input.time, lang),
    ...(compact ? (location ? [location] : []) : appointmentDetails(input, lang).map((line) => line.text)),
    ...(!compact && input.price !== undefined ? [String(input.price)] : []),
    ...(input.style === "card"
      ? [appointmentLabels[input.status], appointmentLabels.reschedule, wordsFor(lang).cancelLabel]
      : [input.style === "summary" ? appointmentLabels.edit : appointmentLabels[input.status]]),
    ...(appointmentCanJoin(input.status, input.locationKind, input.meetingUrl) ? [appointmentJoin] : []),
  ];
}
