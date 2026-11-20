import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Timeline/hours shows one schedule, not a week of shifts compared across people.
export const meta = {
  id: "Roster",
  status: "draft",
  group: "data",
  purpose: "See who works each day this week and spot gaps in cover.",
  pick: "A weekly grid comparing staff shift times across people and days. Not one person's daily schedule (Timeline), one shift (Shift), bookable hours (Availability), a sports lineup (Lineup), or class periods (Timetable).",
  writeHints: [
    "week is the Monday date. Each shift's person is the zero-based index of an entry in people, and day is 0 for Monday through 6 for Sunday. Omit shifts on days off; do not write cover flags.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "A manager edits the rota in a shared app.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "week"],
  items: { key: "shifts", parts: ["root"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, _state, lang): string[] => {
    const { week, people, shifts } = input as z.output<typeof props>;
    const { weekdayShort } = c.wordsFor(lang);
    const oneLine = (value: string) => value.replace(/[\r\n\u2028\u2029]+/g, " ");
    const rows = people.map(({ name }, person) => {
      const schedule = shifts.flatMap((slot, index) => (slot.person === person ? [{ slot, index }] : []));
      schedule.sort((a, b) => a.slot.day - b.slot.day || a.slot.from.localeCompare(b.slot.from));
      const details = schedule.map(({ slot: { day, from, to, role }, index }) => {
        const time = `${c.timeOfDayLine(from, lang)}–${c.timeOfDayLine(to, lang)}`;
        return `${weekdayShort[day]} ${time}${role ? ` ${oneLine(role)}` : ""} (r${index + 1})`;
      });
      return details.length ? `${oneLine(name)}: ${details.join(", ")}` : oneLine(name);
    });
    // Keep staff summaries on separate lines; the shared reader appends the addressed cell actions.
    return [[c.appointmentDate(week, lang), ...rows].join("\n")];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    week: c.isoDate.refine((date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 1, "Use a Monday"),
    people: z
      .array(z.strictObject({ name: c.text(20), photo: c.photo }))
      .min(1)
      .max(8),
    shifts: z
      .array(
        z.strictObject({
          person: z.int().min(0).max(7),
          day: z.int().min(0).max(6),
          from: c.clock,
          to: c.clock,
          role: c.text(12).optional().meta({ kind: undefined }),
        }),
      )
      .min(0)
      .max(40),
  })
  .refine(({ people, shifts }) => shifts.every(({ person }) => person < people.length), {
    path: ["shifts"],
    message: "Every shift must name an existing person index",
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c.itemsOf(cast, 8).flatMap((item) => c.titleOf(item, 20, thing) ?? []);
  return {
    week: "2026-11-16",
    people: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      photo: "lib:people",
    })),
    shifts: [],
  };
}

export const examples = [
  {
    week: "2026-11-16",
    people: [
      { name: "Anna", photo: "lib:people" },
      { name: "Rae", photo: "lib:people" },
    ],
    shifts: [
      { person: 0, day: 0, from: "07:00", to: "12:00", role: "Watering" },
      { person: 1, day: 0, from: "12:00", to: "17:00", role: "Potting" },
      { person: 0, day: 2, from: "08:00", to: "14:00" },
    ],
  },
  {
    density: "compact",
    week: "2026-11-23",
    people: [
      { name: "Sam", photo: "lib:people" },
      { name: "Lee", photo: "lib:people" },
    ],
    shifts: [
      { person: 0, day: 1, from: "08:00", to: "13:00", role: "Park walks" },
      { person: 1, day: 5, from: "13:00", to: "18:00", role: "Home visits" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Roster");
export const probes = [
  choose(
    "Show a Monday-to-Sunday staff rota with one row per person and their assigned hours in each day cell.",
  ),
  choose(
    "Show the timed events in my own day in order, from the morning visit to the evening walk.",
    "Timeline",
  ),
  write(
    "Start the rota Monday 2026-11-16. Put Sam first and Lee second, both with lib:people photos. Sam works Monday 07:00–12:00 and Lee works Saturday 12:00–17:00.",
  ),
  read("Open Anna's Wednesday shift at 08:00", { address: "r1/r3", action: "press" }),
] satisfies c.Probe[];
