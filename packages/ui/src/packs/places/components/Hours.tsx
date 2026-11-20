import { z } from "zod";
import * as c from "../../../catalog";
import { placesWordsFor } from "../lang";

// Core first: Timeline/hours shows one day's events, not a recurring opening week with special dates.
export const meta = {
  id: "Hours",
  status: "draft",
  group: "data",
  purpose: "Check when a place is open today and through the week.",
  pick: "A venue's recurring opening hours across all seven weekdays, with optional special dates. Not a day's events (Timeline), bookable times (Availability), or staff shifts (Roster).",
  writeHints: [
    "Write each weekday exactly once in Monday–Sunday order. For a closed day use 00:00 for both times; opening and closing times must differ on open days. Do not write the computed open state. Use [] when there are no special dates.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Opening hours are stored with the place.",
  variants: { density: ["comfortable", "compact"] },
  items: { key: "days", parts: ["root", "day", "from", "to", "closed"] },
  parts: ["root", "open_state", "special"],
  states: ["filled"],
  read: (input, _state, lang): string[] => {
    const { days, special } = input as z.output<typeof props>;
    const { weekdayNames } = c.wordsFor(lang);
    const { closed } = placesWordsFor(lang);
    return [
      ...days.map(
        ({ day, from, to, closed: off }) =>
          `${weekdayNames[weekdays.indexOf(day)]}: ${off ? closed : `${c.timeOfDayLine(from, lang)}–${c.timeOfDayLine(to, lang)}`}`,
      ),
      ...special.map(({ date, text }) => `${date}: ${text}`),
    ];
  },
} as const satisfies c.Meta;

const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const midnight = "00:00";
const dayProps = z.strictObject({
  day: z.enum(weekdays),
  from: c.clock,
  to: c.clock,
  closed: z.boolean(),
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    days: z.array(dayProps).min(7).max(7),
    special: z
      .array(z.strictObject({ date: c.isoDate, text: c.text(24) }))
      .min(0)
      .max(3),
  })
  .refine(({ days }) => new Set(days.map(({ day }) => day)).size === 7, {
    path: ["days"],
    message: "Give every weekday exactly once",
  })
  .refine(({ days }) => days.every(({ from, to, closed }) => closed || from !== to), {
    path: ["days"],
    message: "Use different opening and closing times on open days",
  })
  .overwrite((value) => ({
    ...value,
    days: [...value.days]
      .sort((a, b) => weekdays.indexOf(a.day) - weekdays.indexOf(b.day))
      .map((day) => (day.closed ? { ...day, from: midnight, to: midnight } : day)),
  }));

export function fallback(_input: c.FallbackInput): z.input<typeof props> {
  return { days: weekdays.map((day) => ({ day, from: midnight, to: midnight, closed: true })), special: [] };
}

export const examples = [
  {
    days: weekdays.map((day) => ({ day, from: "09:00", to: "18:00", closed: false })),
    special: [{ date: "2026-12-24", text: "Closes at 14:00" }],
  },
  {
    days: weekdays.map((day) =>
      day === "mon"
        ? { day, from: "00:00", to: "00:00", closed: true }
        : { day, from: "08:00", to: "16:00", closed: false },
    ),
    special: [{ date: "2026-12-25", text: "Closed for Christmas" }],
    density: "compact",
  },
] satisfies z.input<typeof props>[];

const { choose, write } = c.probesFor("Hours");
export const probes = [
  choose("Show the nursery's opening and closing hours for every weekday and flag holiday changes"),
  choose("Show today's events in order: opening talk at 09:00, tour at 10:00 and demo at noon", "Timeline"),
  write(
    "The garden centre is open 09:00 to 18:00 Monday through Saturday, closed Sundays, and closes at 14:00 on 2026-12-24.",
  ),
] satisfies c.Probe[];
