import { appointmentDate, dateLocaleOf, numberLine, timeOfDayLine, type StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";

type EventCopy = {
  date: string;
  time: string;
  going: number;
  status: "none" | "going" | "interested";
  attendees?: readonly string[] | undefined;
};

export function eventCopy({ date, time, going }: EventCopy, lang?: string) {
  const { event } = socialWordsFor(lang);
  const dateParts = new Intl.DateTimeFormat(dateLocaleOf(lang), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(new Date(`${date}T00:00:00Z`));
  return {
    day: dateParts.find(({ type }) => type === "day")!.value,
    month: dateParts.find(({ type }) => type === "month")!.value,
    time: timeOfDayLine(time, lang),
    count: event.attending(numberLine(going, lang)),
  };
}

export function eventReading(input: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const value = input as EventCopy;
  const { time, count } = eventCopy(value, lang);
  const { event } = socialWordsFor(lang);
  return [
    appointmentDate(value.date, lang),
    time,
    numberLine(value.going, lang),
    count,
    ...(value.attendees ?? []),
    ...(value.status === "none" ? [] : [event.response[value.status]]),
    event.going,
    event.interested,
  ];
}
