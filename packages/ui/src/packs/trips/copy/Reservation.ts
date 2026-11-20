import { appointmentDate, timeOfDayLine } from "../../../catalog";
import { tripsWordsFor, type TripsWords } from "../lang";

type Stamp = { date: string; time: string };
type Reading = {
  kind: keyof TripsWords["reservationKinds"];
  start: Stamp;
  end?: Stamp | undefined;
  from?: string | undefined;
  to?: string | undefined;
  seat?: string | undefined;
  detail?: "full" | "brief" | undefined;
  ref: string;
  code: boolean;
};

export function reservationStampParts({ date, time }: Stamp, lang?: string) {
  return { date: appointmentDate(date, lang), time: timeOfDayLine(time, lang) };
}

export function reservationReading(input: Reading, lang?: string): string[] {
  const { kind, start, end, from, to, ref, seat, detail, code } = input;
  const words = tripsWordsFor(lang);
  const labels = words.reservationStops(kind);
  const stamp = (value: Stamp) => {
    const { date, time } = reservationStampParts(value, lang);
    return words.reservationStamp(date, time);
  };
  return [
    words.reservationKinds[kind],
    [labels.start, from && JSON.stringify(from), stamp(start)].filter(Boolean).join(" "),
    ...(to || end
      ? [[labels.end, to && JSON.stringify(to), end && stamp(end)].filter(Boolean).join(" ")]
      : []),
    ...(seat && detail !== "brief" ? [JSON.stringify(words.reservationSeat(kind, seat))] : []),
    words.reservationRef,
    words.reservationReadRef(JSON.stringify(ref)),
    words.copyReservationRef,
    ...(code ? [words.reservationCode] : []),
  ];
}
