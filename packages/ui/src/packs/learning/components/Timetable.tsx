import { z } from "zod";
import * as c from "../../../catalog";

const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

// Core first: Timeline/hours cannot group repeating classes by weekday and show room and teacher per period.
export const meta = {
  id: "Timetable",
  status: "draft",
  group: "data",
  purpose: "See the week's repeating classes and where to go for each period.",
  pick: "A student's repeating week of class periods with subject, room and teacher. Not a one-day schedule (Timeline), staff shifts (Roster), bookable slots (Slots) or family events (Agenda).",
  writeHints: [
    "Write each scheduled weekday once. For each period, write a 24-hour start time and subject, with room, teacher and semantic tone if supplied. Leave selected_day null; it is for the locally selected view. Never write the current period.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The timetable is stored on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "day"],
  items: { key: "periods", parts: ["root", "time", "subject", "room", "teacher"] },
  states: ["filled", "empty"],
  selections: { day: { prop: "selected_day", choices: { prop: "scheduled_days" } } },
  actions: { parts: { day: ["select"] }, items: { root: ["press"] } },
  read: (input, _state, lang): string[] => {
    const { days } = input as z.output<typeof props>;
    const { weekdayNames } = c.wordsFor(lang);
    let index = 0;
    return days.flatMap(({ day, periods }) =>
      periods.map(
        ({ time, subject, room, teacher }) =>
          `r${++index}: ${[weekdayNames[weekdays.indexOf(day)], c.timeOfDayLine(time, lang), subject, room, teacher].filter(Boolean).join(" · ")}`,
      ),
    );
  },
} as const satisfies c.Meta;

const period = z.strictObject({
  time: c.clock,
  subject: c.text(24),
  room: c.text(12).optional(),
  teacher: c.text(24).optional(),
  tone: z.enum(["neutral", "good", "warn", "bad"]).optional(),
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    selected_day: z.enum(weekdays).optional(),
    days: z
      .array(
        z.strictObject({
          day: z.enum(weekdays),
          periods: z.array(period).min(1).max(8),
        }),
      )
      .min(1)
      .max(7),
  })
  .refine(({ days }) => new Set(days.map(({ day }) => day)).size === days.length, { path: ["days"] })
  .overwrite((value) => ({
    ...value,
    selected_day: value.days.some(({ day }) => day === value.selected_day) ? value.selected_day : undefined,
    scheduled_days: value.days.map(({ day }) => day),
    periods: value.days.flatMap(({ day, periods }) => periods.map((period) => ({ day, ...period }))),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const subjects = c.itemsOf(cast, 4);
  return {
    days: [
      {
        day: "mon",
        periods: (subjects.length ? subjects : [undefined]).map((item, index) => ({
          time: "00:00",
          subject: (item && c.titleOf(item, 24, thing)) ?? c.placeholderTitle(index, lang),
          teacher: item && c.detailOf(item, 24, thing),
        })),
      },
    ],
  };
}

export const examples = [
  {
    days: [
      {
        day: "mon",
        periods: [{ time: "09:00", subject: "Fern care", room: "B12", teacher: "Ms Tanaka", tone: "good" }],
      },
      { day: "wed", periods: [{ time: "10:30", subject: "Soil workshop", room: "Glasshouse" }] },
    ],
  },
  {
    density: "compact",
    surface: "outlined",
    days: [
      { day: "tue", periods: [{ time: "13:00", subject: "Lead skills", teacher: "Mr Woods" }] },
      { day: "thu", periods: [{ time: "14:15", subject: "Dog body language", room: "C04" }] },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Timetable");
export const probes = [
  choose("Show my repeating school week, with each day's class periods, start times, rooms and teachers."),
  choose(
    "Show just today's events in chronological order with times, from morning to evening. It does not repeat.",
    "Timeline",
  ),
  write(
    "Japanese with Ms Tanaka in B12 at 09:00 every Monday, and Calligraphy in Studio 2 at 10:30 every Wednesday.",
  ),
  read("Select Wednesday in the weekday picker, without opening any class.", {
    address: "t1/day",
    action: "select",
  }),
] satisfies c.Probe[];
