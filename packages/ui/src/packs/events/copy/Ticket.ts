import { appointmentDate, timeOfDayLine, type StateName } from "../../../catalog";
import { eventsWordsFor } from "../lang";

type Stamp = { date: string; time: string };
export const ticketStatuses = ["valid", "transferred", "used"] as const;
type Status = (typeof ticketStatuses)[number];
type SeatFields = Partial<Record<"section" | "row" | "seat", string | undefined>>;
type Reading = Stamp &
  SeatFields & {
    holder: string;
    detail?: "full" | "brief" | undefined;
    status?: Status | undefined;
  };

export function ticketStamp({ date, time }: Stamp, lang?: string) {
  return { date: appointmentDate(date, lang), time: timeOfDayLine(time, lang) };
}

export function ticketSeat(input: SeatFields, lang?: string) {
  const { ticket } = eventsWordsFor(lang);
  return (["section", "row", "seat"] as const).flatMap((part) => {
    const value = input[part];
    return value === undefined ? [] : [{ part, text: ticket[part](value) }];
  });
}

export function ticketAdmission(status: Status | undefined, state: StateName, lang?: string) {
  const { ticket } = eventsWordsFor(lang);
  const scanned = state === "success" && status !== "transferred";
  const inactive = status === "used" || status === "transferred";
  const label = status && ticket.status[scanned ? "used" : status];
  return {
    blocked: scanned || inactive,
    scanned,
    status: label,
    feedback: scanned ? ticket.scanned : inactive ? label : undefined,
  };
}

export function ticketReading(input: Reading, state: StateName, lang?: string): string[] {
  const { ticket } = eventsWordsFor(lang);
  const { date, time } = ticketStamp(input, lang);
  const { blocked, feedback, status } = ticketAdmission(input.status, state, lang);
  const seat = ticketSeat(input, lang)
    .map(({ text }) => text)
    .join(ticket.stampSeparator);
  return [
    `${date}${ticket.stampSeparator}${time}`,
    ticket.holder(input.holder),
    ...[seat, status === feedback ? undefined : status, feedback].filter((line): line is string =>
      Boolean(line),
    ),
    ...(!blocked && input.detail !== "brief" ? [ticket.hint] : []),
  ];
}
