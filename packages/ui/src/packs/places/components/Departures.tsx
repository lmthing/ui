import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Timeline/hours cannot show live countdowns and delays for transit lines leaving one stop.
export const meta = {
  id: "Departures",
  status: "draft",
  group: "data",
  purpose: "See what leaves a transit stop next and whether it is delayed.",
  pick: "Next live buses, trains or ferries from one stop, with line badges, destinations, minutes and delays. Not a day's events (Timeline) or a journey's ordered stops (Route).",
  writeHints: ["Write stop, line and destination only. The transit service supplies minutes and delays."],
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "Live departure times come from a transit data service.",
  variants: { density: ["comfortable", "compact"] },
  items: { key: "rows", parts: ["root", "line", "to", "minutes", "delay"] },
  parts: ["root", "stop", "more"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
} as const satisfies c.Meta;

const rowProps = z.strictObject({ line: c.text(6), to: c.text(28) });
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  stop: c.text(32),
  rows: z.array(rowProps).min(1).max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [stop, ...destinations] = c.itemsOf(cast, 4);
  return {
    stop: (stop && c.titleOf(stop, 32, thing)) || c.placeholderTitle(0, lang),
    rows: (destinations.length ? destinations : [undefined]).map((item, index) => ({
      line: c.placeholderValue,
      to: (item && c.titleOf(item, 28, thing)) || c.placeholderTitle(index + 1, lang),
    })),
  };
}

export const examples = [
  {
    stop: "Nursery Gate",
    rows: [
      { line: "24", to: "City Centre" },
      { line: "24A", to: "Botanic Gardens" },
    ],
  },
  {
    stop: "Alder Park",
    rows: [
      { line: "8", to: "Clifton" },
      { line: "9", to: "Riverside" },
    ],
    density: "compact",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Departures");
export const probes = [
  choose(
    "At my bus stop show what leaves next, with live minutes to departure and a warning when a bus is delayed",
  ),
  choose("Show today's itinerary by time: meet at 09:00, nursery tour at 10:00, lunch at noon", "Timeline"),
  write("At Nursery Gate show upcoming buses: line 24 to City Centre and line 24A to Botanic Gardens."),
  read("Open bus 24A to Botanic Gardens", { address: "d1/r2", action: "press" }),
] satisfies c.Probe[];
