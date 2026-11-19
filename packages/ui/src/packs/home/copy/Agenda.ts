export const agendaLabels = {
  add: "Add event",
  allDay: "All day",
  conflict: "Time conflict",
  everyone: "Everyone",
} as const;

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export const agendaDay = (date: string) =>
  dayFormat
    .formatToParts(new Date(`${date}T00:00:00Z`))
    .filter(({ type }) => type !== "literal")
    .map(({ value }) => value)
    .join(" ");

export const agendaInitial = (name: string) => Array.from(name)[0]?.toUpperCase() ?? "";

export const agendaEveryone = (name: string) => name.toLowerCase() === agendaLabels.everyone.toLowerCase();

export function agendaPeople(who: readonly string[]): string {
  return who.some(agendaEveryone) ? agendaLabels.everyone : who.join(", ");
}

export function agendaAttendees(who: readonly string[]): string {
  return who.some(agendaEveryone) ? agendaLabels.everyone : who.map(agendaInitial).join(", ");
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

export function agendaReading(event: Omit<EventLine, "date">, id = event.id): string {
  const people = agendaPeople(event.who);
  const initials = people === agendaLabels.everyone ? "" : ` (${agendaAttendees(event.who)})`;
  const conflict = event.conflict ? ` · ${agendaLabels.conflict}` : "";
  return `${id ?? ""} ${event.time ?? agendaLabels.allDay} ${event.title} · ${people}${initials}${conflict}`.trim();
}

export function agendaScheduleReading(entries: EventLine[]): string[] {
  return [
    ...entries.flatMap((event, index) => [
      ...(entries[index - 1]?.date !== event.date ? [agendaDay(event.date)] : []),
      agendaReading(event),
    ]),
    agendaLabels.add,
  ];
}
