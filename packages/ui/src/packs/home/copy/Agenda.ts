import { dateLocaleOf, defaultLang, localeOf, timeOfDayLine } from "../../../catalog";
import { homeWordsFor } from "../lang";

export const { agendaLabels } = homeWordsFor();

export function agendaDay(date: string, lang?: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat(dateLocaleOf(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  if (localeOf(lang) !== defaultLang) return formatter.format(value);
  return formatter
    .formatToParts(value)
    .filter(({ type }) => type !== "literal")
    .map(({ value }) => value)
    .join(" ");
}

export const agendaInitial = (name: string, lang?: string) =>
  Array.from(name)[0]?.toLocaleUpperCase(localeOf(lang)) ?? "";

// The existing wire sentinel is recognized independently of the display language.
const agendaEveryone = (name: string) => name.toLowerCase() === agendaLabels.everyone.toLowerCase();

export function agendaPeople(who: readonly string[], lang?: string): string {
  return who.some(agendaEveryone) ? homeWordsFor(lang).agendaLabels.everyone : who.join(", ");
}

export function agendaAttendees(who: readonly string[], lang?: string): string {
  return who.some(agendaEveryone)
    ? homeWordsFor(lang).agendaLabels.everyone
    : who.map((name) => agendaInitial(name, lang)).join(", ");
}

type EventSeed = {
  time?: string | undefined;
  title: string;
  who: string[];
};
type EventLine = EventSeed & { date: string; conflict: boolean; id?: string };

/** Agenda's shared projection for the view and reader. Dates are grouped before item IDs are stamped. */
export function agendaEntries(days: { date: string; events: EventSeed[] }[]): EventLine[] {
  const events = days.flatMap(({ date, events }) => events.map((event) => ({ ...event, date })));
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events.map((event) => ({
    ...event,
    conflict:
      Boolean(event.time) &&
      events.some(
        (other) =>
          other !== event &&
          other.date === event.date &&
          other.time === event.time &&
          peopleOverlap(event.who, other.who),
      ),
  }));
}

function peopleOverlap(a: string[], b: string[]) {
  if (a.some(agendaEveryone) || b.some(agendaEveryone)) return true;
  const names = new Set(b.map((name) => name.toLowerCase()));
  return a.some((name) => names.has(name.toLowerCase()));
}

export function agendaReading(event: Omit<EventLine, "date">, id = event.id, lang?: string): string {
  const { agendaLabels } = homeWordsFor(lang);
  const people = agendaPeople(event.who, lang);
  const initials = event.who.some(agendaEveryone) ? "" : ` (${agendaAttendees(event.who, lang)})`;
  const conflict = event.conflict ? ` · ${agendaLabels.conflict}` : "";
  return `${id ?? ""} ${event.time ? timeOfDayLine(event.time, lang) : agendaLabels.allDay} ${event.title} · ${people}${initials}${conflict}`.trim();
}

export function agendaScheduleReading(entries: EventLine[], lang?: string): string[] {
  return [
    ...entries.flatMap((event, index) => [
      ...(entries[index - 1]?.date !== event.date ? [agendaDay(event.date, lang)] : []),
      agendaReading(event, event.id, lang),
    ]),
    homeWordsFor(lang).agendaLabels.add,
  ];
}
