import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Timer/up measures an activity but does not record clock-ins, clock-outs and breaks for work.
export const meta = {
  id: "TimeClock",
  status: "draft",
  group: "input",
  purpose: "Clock in and out of a work shift and record breaks.",
  pick: "Record work attendance with clock-in, clock-out and breaks for the current shift. Not a stopwatch or countdown for an activity (Timer), or approving a week's hours (Timesheet).",
  writeHints: [
    "on means clocked in. since is the local clock-in time if known; omit it when off. Do not write elapsed time or breaks.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Clock events stay on the device; sharing them with a manager needs a shared app.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "shift", "since", "elapsed", "breaks", "clock", "break"],
  states: ["filled", "success"],
  actions: { parts: { clock: ["press"], break: ["press"] }, when: { break: { on: true } } },
  read: (input, _state, lang): string[] => {
    const { on, since } = input as z.output<typeof props>;
    return [`on:${on}`, ...(on && since ? [c.timeOfDayLine(since, lang)] : [])];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  on: z.boolean(),
  since: c.clock.optional(),
  shift: c.text(28).optional(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [item] = c.itemsOf(cast, 1);
  return { on: false, shift: (item && c.titleOf(item, 28, c.thingOf(cast))) ?? c.placeholderTitle(0, lang) };
}

export const examples = [
  { on: true, since: "07:00", shift: "Morning greenhouse care" },
  { on: false, shift: "Afternoon park walks", density: "compact" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("TimeClock");
export const probes = [
  choose("Let staff clock in and out of work and record breaks during the active shift."),
  choose(
    "Give me a five-minute countdown for soaking a plant, with start and reset, without recording work hours.",
    "Timer",
  ),
  write("I clocked into Morning greenhouse care at 07:00. Show the active work clock with a break control."),
  read("Take a break on this active shift", { address: "t1/break", action: "press" }),
] satisfies c.Probe[];
