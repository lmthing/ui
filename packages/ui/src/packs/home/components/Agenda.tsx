import { z } from "zod";
// prettier-ignore
import { clock, isoDate, itemsOf, placeholderTitle, probesFor, screenId, text, timeOfDayLine,
  thingOf, titleOf, variantProps, type FallbackInput, type Meta, type Probe, type Props } from "../../../catalog";
import { KitAction, KitCard, KitContent, KitEmpty, useComponentState, useWords } from "../../../kit";
import { TimelineFlow, type TimelineFlowGroup } from "../../../kit/timeline";
import {
  agendaDay,
  agendaAttendees,
  agendaEntries,
  agendaPeople,
  agendaReading,
  agendaScheduleReading,
} from "../copy";
import { homeWordsFor } from "../lang";

// Core first: Timeline/hours cannot group several days and identify all family attendees.
export const meta = {
  id: "Agenda",
  status: "ready",
  group: "data",
  purpose: "Group the family's events by date across multiple days, showing who attends each.",
  pick: "The family's next seven days grouped by date: each day heading has timed or all-day events and each event's attendees. This multi-day family week belongs here, not Timeline: Timeline/hours is one day and has no per-event attendees. Not a month of marked dates (Calendar) or class timetables (Timetable).",
  writeHints: [
    'days holds 1–7 dates with 1–6 events each. Each event has 1–4 who labels; use ["Everyone"] for the whole family. Omit time for an all-day event. Code computes conflicts.',
    'Use group "none" only when asked to hide day headings. Keep the dates in days. Write surface:null unless asked for an outlined card; removing headings does not change its finish.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Events stay on the device; sharing a family calendar needs people and syncing needs a service.",
  variants: { group: ["dates", "none"], surface: ["card", "outlined"] },
  items: {
    key: "entries",
    parts: ["root", "date", "time", "title", "who", "conflict"],
  },
  variantParts: { "group.none": { hides: ["date"] } },
  parts: ["root", "empty", "add"],
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] }, parts: { add: ["press"] } },
  read: (input, state, lang): string[] => {
    const { entries, group } = input as { entries: ReturnType<typeof agendaEntries>; group: string };
    return state === "filled" ? agendaScheduleReading(entries, lang, group !== "none") : [];
  },
} as const satisfies Meta;
const eventProps = z.strictObject({
  time: clock.optional(),
  title: text(32),
  who: z.array(text(12)).min(1).max(4),
});
const dayProps = z.strictObject({ date: isoDate, events: z.array(eventProps).min(1).max(6) });
export const props = z
  .strictObject({ ...variantProps(meta.variants), days: z.array(dayProps).min(1).max(7), goto: screenId })
  .overwrite((value) => ({ ...value, entries: agendaEntries(value.days), add: { goto: value.goto } }));

type Entry = ReturnType<typeof agendaEntries>[number] & { id: string };
type AgendaProps = Props<typeof props, typeof meta> & { entries: Entry[] };
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 6);
  return {
    days: [
      {
        date: new Date(0).toISOString().slice(0, 10),
        events: (items.length ? items : [undefined]).map((item, index) => ({
          title: item
            ? (titleOf(item, 32, thing) ?? placeholderTitle(index, lang))
            : placeholderTitle(index, lang),
          who: [placeholderTitle(index, lang)],
        })),
      },
    ],
    goto: "add_event",
  };
}
const plantAgenda = {
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
};
export const examples = [
  plantAgenda,
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
  { ...plantAgenda, group: "none" },
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
  {
    ...write(
      "Garden centre at 09:00 on November 20 for Mia, repot the fern on November 21, 2026 for Sam. Show one continuous family event list without day headings.",
    ),
    variant: { axis: "group", value: "none" },
  },
] satisfies Probe[];
function AgendaEvents({ entries, headings, lang }: { entries: Entry[]; headings: boolean; lang: string }) {
  const { agendaLabels } = homeWordsFor(lang);
  type Group = Omit<TimelineFlowGroup, "rows"> & { rows: TimelineFlowGroup["rows"][number][] };
  const groups = new Map<string | undefined, Group>();
  for (const event of entries) {
    const date = headings ? event.date : undefined;
    let group = groups.get(date);
    if (!group) {
      group = { rows: [], ...(date ? { date: { part: "date", text: agendaDay(date, lang) } } : {}) };
      groups.set(date, group);
    }
    group.rows.push({
      kind: "summary",
      item: event.id,
      label: agendaReading(event, "", lang),
      slots: {
        title: { part: "title", text: event.title },
        time: { part: "time", text: event.time ? timeOfDayLine(event.time, lang) : agendaLabels.allDay },
        byline: {
          part: "who",
          label: agendaPeople(event.who, lang),
          text: agendaAttendees(event.who, lang),
          icon: "user",
        },
        ...(event.conflict ? { status: { part: "conflict", text: agendaLabels.conflict } } : {}),
      },
    });
  }
  return <TimelineFlow groups={[...groups.values()]} />;
}

export function Agenda({ entries, goto, group, surface }: AgendaProps) {
  const state = useComponentState();
  const {
    lang,
    words: { agendaLabels },
  } = useWords(homeWordsFor);
  if (state === "empty")
    return (
      <KitCard
        part="root"
        {...{ surface }}
        children={<KitEmpty part="empty" icon="calendar" decorativeIcon />}
      />
    );
  return (
    <KitCard part="root" padded {...{ surface }}>
      <AgendaEvents entries={entries} headings={group === "dates"} lang={lang} />
      <KitContent group="response">
        <KitAction label={agendaLabels.add} part="add" goto={goto} kind="secondary" full />
      </KitContent>
    </KitCard>
  );
}
