import { appointmentDate, timeOfDayLine, type StateName } from "../../../catalog";
import { eventsWordsFor } from "../lang";

type Stamp = { date: string; time: string };
type Reading = Stamp & { holder: string; detail?: "full" | "brief" | undefined };

export function ticketStamp({ date, time }: Stamp, lang?: string) {
  return { date: appointmentDate(date, lang), time: timeOfDayLine(time, lang) };
}

export function ticketReading(input: Reading, state: StateName, lang?: string): string[] {
  const { ticket } = eventsWordsFor(lang);
  const { date, time } = ticketStamp(input, lang);
  return [
    `${date}${ticket.stampSeparator}${time}`,
    ticket.holder(input.holder),
    ...(state === "success" ? [ticket.scanned] : input.detail === "brief" ? [] : [ticket.hint]),
  ];
}
