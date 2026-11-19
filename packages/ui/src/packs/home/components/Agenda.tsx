import { z } from "zod";
import {
  clock,
  homeLabels,
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
} from "../../../catalog";

// Core first: Timeline/hours cannot group several days and identify all family attendees.
export const meta = {
  id: "Agenda",
  status: "draft",
  group: "data",
  purpose: "Group the family's events by date across multiple days, showing who attends each.",
  pick: "The family's next seven days grouped by date: each day heading has timed or all-day events and each event's attendees. This multi-day family week belongs here, not Timeline: Timeline/hours is one day and has no per-event attendees. Not a month of marked dates (Calendar) or class timetables (Timetable).",
  writeHints: [
    "days holds 1–7 dates with 1–6 events each. Each event has 1–4 who labels. Write event times and attendees, never a conflict flag; code computes conflicts.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Events stay on the device; sharing a family calendar needs people and syncing needs a service.",
  items: { key: "entries", parts: ["root", "date", "time", "title", "who"] },
  parts: ["root", "add"],
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] }, parts: { add: ["press"] } },
  read: (input, state) => {
    if (state !== "filled") return [];
    const { days, entries } = input as z.output<typeof props> & { entries: { id?: string }[] };
    let at = 0;
    return [
      ...days.flatMap((day) => [
        day.date,
        ...day.events.map((event) =>
          `${entries[at++]?.id ?? ""} ${event.time ?? ""} ${event.title} · ${event.who.join(", ")}`.trim(),
        ),
      ]),
      homeLabels.add,
    ];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    days: z
      .array(
        z.strictObject({
          date: isoDate,
          events: z
            .array(
              z.strictObject({
                time: clock.optional(),
                title: text(32),
                who: z.array(text(12)).min(1).max(4),
              }),
            )
            .min(1)
            .max(6),
        }),
      )
      .min(1)
      .max(7),
    goto: screenId,
  })
  .overwrite((value) => ({
    ...value,
    entries: value.days.flatMap((day) => day.events.map((event) => ({ ...event, date: day.date }))),
  }));
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
