import { z } from "zod";
import {
  clock,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitAction,
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitIcon,
  KitRow,
  KitText,
  KitTrack,
  useComponentState,
} from "../../../kit";
import {
  agendaDay,
  agendaAttendees,
  agendaEntries,
  agendaLabels,
  agendaPeople,
  agendaReading,
  agendaScheduleReading,
} from "../copy";

// Core first: Timeline/hours cannot group several days and identify all family attendees.
export const meta = {
  id: "Agenda",
  status: "ready",
  group: "data",
  purpose: "Group the family's events by date across multiple days, showing who attends each.",
  pick: "The family's next seven days grouped by date: each day heading has timed or all-day events and each event's attendees. This multi-day family week belongs here, not Timeline: Timeline/hours is one day and has no per-event attendees. Not a month of marked dates (Calendar) or class timetables (Timetable).",
  writeHints: [
    'days holds 1–7 dates with 1–6 events each. Each event has 1–4 who labels; use ["Everyone"] for the whole family. Omit time for an all-day event. Code computes conflicts.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Events stay on the device; sharing a family calendar needs people and syncing needs a service.",
  items: { key: "entries", parts: ["root", "date", "time", "title", "who", "conflict"] },
  parts: ["root", "empty", "add"],
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] }, parts: { add: ["press"] } },
  read: (input, state) =>
    state === "filled"
      ? agendaScheduleReading((input as { entries: ReturnType<typeof agendaEntries> }).entries)
      : [],
} as const satisfies Meta;
const eventProps = z.strictObject({
  time: clock.optional(),
  title: text(32),
  who: z.array(text(12)).min(1).max(4),
});
const dayProps = z.strictObject({ date: isoDate, events: z.array(eventProps).min(1).max(6) });
export const props = z
  .strictObject({ days: z.array(dayProps).min(1).max(7), goto: screenId })
  .overwrite((value) => ({ ...value, entries: agendaEntries(value.days), add: { goto: value.goto } }));

type Entry = ReturnType<typeof agendaEntries>[number] & { id: string };
type AgendaProps = Props<typeof props, typeof meta> & { entries: Entry[] };
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 6);
  return {
    days: [
      {
        date: new Date(0).toISOString().slice(0, 10),
        events: (items.length ? items : [undefined]).map((item, index) => ({
          title: item ? (titleOf(item, 32, thing) ?? placeholderTitle(index)) : placeholderTitle(index),
          who: [placeholderTitle(index)],
        })),
      },
    ],
    goto: "add_event",
  };
}
export const examples = [
  {
    days: [
      {
        date: "2026-11-20",
        events: [
          { time: "09:00", title: "Visit the garden centre", who: ["Sam", "Mia"] },
          { title: "Bring the fern inside", who: ["Alex"] },
        ],
      },
      { date: "2026-11-21", events: [{ time: "11:30", title: "Repot the Monstera", who: ["Sam"] }] },
    ],
    goto: "add_event",
  },
  {
    days: [
      {
        date: "2026-11-20",
        events: [
          { time: "16:00", title: "Clover's park walk", who: ["Alex"] },
          { time: "16:00", title: "Meet the walker", who: ["Everyone"] },
          { time: "17:30", title: "Collect dog food", who: ["Sam", "Alex"] },
        ],
      },
    ],
    goto: "add_event",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Agenda");
export const probes = [
  choose("The family's next seven days grouped by date, showing each event's time and who attends"),
  choose("One day's schedule by the hour, with start and end times and no family attendees", "Timeline"),
  write(
    "20 November 2026: garden centre at 09:00 for Sam and Mia, bring the fern inside for Alex with no time; add events on add_event",
  ),
  read("Add a family event", { address: "a1/add", action: "press" }),
  read("Open the garden centre event", { address: "a1/r1", action: "press" }),
] satisfies Probe[];
function AgendaEvent({ event, heading, laterDay }: { event: Entry; heading: boolean; laterDay: boolean }) {
  return (
    <KitRow item={event.id} role="button" label={agendaReading(event, "")} inline>
      {heading && (
        <KitContent group={laterDay ? "response" : "content"}>
          <KitText role="heading" part="date">
            {agendaDay(event.date)}
          </KitText>
        </KitContent>
      )}
      <KitGrid columns={2} fitLast>
        <KitContent>
          <KitText part="title">{event.title}</KitText>
          <KitText part="time" role="label" tone="muted" tabular>
            {event.time ?? agendaLabels.allDay}
          </KitText>
          {event.conflict && (
            <KitText part="conflict" role="label" tone="warn">
              {agendaLabels.conflict}
            </KitText>
          )}
        </KitContent>
        <KitTrack part="who" label={agendaPeople(event.who)}>
          <KitIcon name="user" scale="sm" decorative />
          <KitText part={null} role="label" tone="muted" lines={1}>
            {agendaAttendees(event.who)}
          </KitText>
        </KitTrack>
      </KitGrid>
    </KitRow>
  );
}

export function Agenda({ entries, goto }: AgendaProps) {
  const state = useComponentState();
  if (state === "empty")
    return <KitCard part="root" children={<KitEmpty part="empty" icon="calendar" decorativeIcon />} />;
  return (
    <KitCard part="root" padded>
      {entries.map((event, index) => {
        const heading = entries[index - 1]?.date !== event.date;
        return <AgendaEvent key={event.id} event={event} heading={heading} laterDay={index > 0} />;
      })}
      <KitAction label={agendaLabels.add} part="add" goto={goto} kind="secondary" full />
    </KitCard>
  );
}
