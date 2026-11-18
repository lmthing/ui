import { z } from "zod";
import { clock, probesFor, type CastLike, type Meta, type Probe } from "../../../catalog";

// Core first: Field/time edits one time, not a seven-day working week with switches and breaks.
export const meta = {
  id: "Availability",
  status: "draft",
  group: "input",
  purpose: "Set the working week during which people can book.",
  pick: "Seven weekdays with working switches, start and end times and breaks. Not one time field (Field), one day's free starts (Slots), staff shifts (Roster), or venue opening hours (Hours).",
  writeHints: [
    "Write each weekday once, mon through sun. End follows start; breaks need both endpoints inside working hours.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Working hours stored on the device.",
  items: { key: "days", parts: ["root", "day", "toggle", "from", "to"] },
  parts: ["root"],
  states: ["filled"],
  actions: { items: { toggle: ["toggle"], from: ["type"], to: ["type"] } },
} as const satisfies Meta;
const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const props = z
  .strictObject({
    days: z
      .array(
        z.strictObject({
          day: z.enum(weekdays).meta({ kind: "text" }),
          on: z.boolean(),
          from: clock,
          to: clock,
          breakFrom: clock.optional(),
          breakTo: clock.optional(),
        }),
      )
      .min(7)
      .max(7),
  })
  .refine(
    ({ days }) =>
      new Set(days.map((day) => day.day)).size === 7 &&
      days.every(
        (day) =>
          (!day.on || day.from < day.to) &&
          ((day.breakFrom === undefined && day.breakTo === undefined) ||
            !!(
              day.breakFrom &&
              day.breakTo &&
              day.from <= day.breakFrom &&
              day.breakFrom < day.breakTo &&
              day.breakTo <= day.to
            )),
      ),
    { path: ["days"] },
  );
export function fallback(_input: { cast: CastLike }): z.input<typeof props> {
  return { days: weekdays.map((day) => ({ day, on: false, from: "09:00", to: "17:00" })) };
}
export const examples = [
  {
    days: weekdays.map((day) => ({
      day,
      on: !["sat", "sun"].includes(day),
      from: "09:00",
      to: "17:00",
      breakFrom: "12:00",
      breakTo: "13:00",
    })),
  },
  {
    days: weekdays.map((day) => ({
      day,
      on: ["mon", "wed", "fri"].includes(day),
      from: "08:00",
      to: "16:00",
    })),
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Availability");
export const probes = [
  choose("Set which weekdays I take bookings, the start and finish each day, and my lunch break"),
  choose("Enter a single start time in a form", "Field"),
  write("Take bookings Monday to Friday 09:00 to 17:00, weekends off, no breaks"),
  read("Turn off bookings on Monday", { address: "a1/r1/toggle", action: "toggle" }),
] satisfies Probe[];
