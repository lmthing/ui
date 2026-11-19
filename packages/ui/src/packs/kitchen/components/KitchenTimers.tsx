import { z } from "zod";
import {
  clockLine,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Timer/ring cannot run independently named concurrent countdowns with add-minute controls.
export const meta = {
  id: "KitchenTimers",
  status: "draft",
  group: "action",
  purpose: "Run several named cooking timers at once and adjust each independently.",
  pick: "Two or more concurrent named cooking timers, each with start, stop and add a minute. One countdown remains Timer; an instruction's timer remains CookSteps.",
  writeHints: [
    "seconds is each timer's seed duration, 1–14400. Do not write remaining time, progress, running state or sorted order.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { root: "ok" },
  realPath: "Timers run on the device; alarm notifications need permission.",
  items: { key: "timers", parts: ["root", "label", "seconds", "more"] },
  parts: ["root"],
  states: ["filled", "empty"],
  actions: { items: { root: ["start", "stop"], more: ["press"] } },
  read: (input) => (input as z.output<typeof props>).timers.map((timer) => clockLine(timer.seconds)),
} as const satisfies Meta;
export const props = z.strictObject({
  timers: z
    .array(z.strictObject({ label: text(16), seconds: z.int().min(1).max(14400) }))
    .min(1)
    .max(6),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const timers = itemsOf(cast, 3).map((item, index) => ({
    label: titleOf(item, 16, thing) ?? placeholderTitle(index),
    seconds: 60,
  }));
  return {
    timers: timers.length
      ? timers
      : [
          { label: placeholderTitle(0), seconds: 60 },
          { label: placeholderTitle(1), seconds: 60 },
        ],
  };
}
export const examples = [
  {
    timers: [
      { label: "Béchamel", seconds: 372 },
      { label: "Oven", seconds: 1120 },
    ],
  },
  {
    timers: [
      { label: "Porridge", seconds: 300 },
      { label: "Tea", seconds: 180 },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("KitchenTimers");
export const probes = [
  choose("Run separate pasta and oven countdowns at the same time, each with pause and add a minute"),
  choose("Run one six-minute countdown with start and stop, without any other timers", "Timer"),
  write("Two concurrent cooking timers: Béchamel for 372 seconds and Oven for 1120 seconds"),
  read("Start the béchamel timer", { address: "k1/r1", action: "start" }),
  read("Add a minute to the oven timer", { address: "k1/r2/more", action: "press" }),
] satisfies Probe[];
