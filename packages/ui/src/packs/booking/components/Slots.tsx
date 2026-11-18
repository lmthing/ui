import { z } from "zod";
import { clock, probesFor, type CastLike, type Meta, type Probe } from "../../../catalog";

// Core first: Calendar/week selects dates, not free and taken times within a day.
// KitSlotGrid is not built; this component deliberately remains a draft.
export const meta = {
  id: "Slots",
  status: "draft",
  group: "input",
  purpose: "Choose a free start time on the selected day.",
  pick: "Free and taken start times within one day. Not choosing a date (Calendar) or setting the working week (Availability).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Free times computed on the device from working hours minus bookings.",
  items: { key: "times", parts: ["root", "time"] },
  parts: ["root", "minutes"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["select"] }, when: { root: { taken: false } } },
  read: (input, state) =>
    state === "filled"
      ? (input as z.output<typeof props>).times.map(({ time, taken }) => `${time}${taken ? " (taken)" : ""}`)
      : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    times: z
      .array(z.strictObject({ time: clock.meta({ kind: "text" }), taken: z.boolean() }))
      .min(1)
      .max(24),
    at: clock.optional(),
    minutes: z.int().min(5).max(600),
    style: z.enum(["grid", "list"]).default("grid"),
  })
  .refine(({ times, at }) => !at || times.some((slot) => slot.time === at && !slot.taken), { path: ["at"] });
export function fallback(_input: { cast: CastLike }): z.input<typeof props> {
  return { times: [{ time: "09:00", taken: false }], minutes: 30 };
}
export const examples = [
  {
    style: "grid",
    times: [
      { time: "09:00", taken: false },
      { time: "09:30", taken: true },
    ],
    at: "09:00",
    minutes: 30,
  },
  {
    style: "list",
    times: [
      { time: "14:00", taken: false },
      { time: "15:00", taken: true },
    ],
    minutes: 60,
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Slots");
export const probes = [
  choose("Pick a free start time today, with already taken times disabled"),
  choose("Choose which day next week I want to book", "Calendar"),
  write("Start times 09:00 free and 09:30 taken, thirty minute appointments"),
  read("Choose the free 09:00 time", { address: "s1/r1", action: "select" }),
] satisfies Probe[];
