import { z } from "zod";
import {
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

// Core first: Sparkline/default cannot show a holding's full price history with selectable time ranges.
export const meta = {
  id: "PriceChart",
  status: "draft",
  group: "data",
  purpose: "See how one holding's price moved over a chosen period.",
  pick: "A holding's price history with selectable day, week, month, year and all ranges. Not a compact recent value trend (Sparkline), one sum (Amount), personal measurements (Measurements), or a business metric (LineChart).",
  writeHints: [
    "points are 8–60 numeric prices in time order. Code derives current price and change; never write them or currency.",
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "Prices fetched from a market data service.",
  parts: ["root", "name", "price", "change", "line", "range"],
  states: ["filled", "loading"],
  select: { prop: "range", value: { field: "range" } },
  actions: { parts: { range: ["select"] } },
} as const satisfies Meta;

export const props = z.strictObject({
  name: text(24),
  points: z.array(z.number().nonnegative()).min(8).max(60),
  range: z.enum(["day", "week", "month", "year", "all"]),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  return {
    name: (item && titleOf(item, 24, thing)) || placeholderTitle(0),
    points: Array.from({ length: 8 }, () => 0),
    range: "month",
  };
}

export const examples = [
  { name: "Ledge savings holding", points: [98, 99, 98.5, 100, 101, 100.5, 102, 103], range: "month" },
  { name: "Trot rainy-day holding", points: [24, 23, 24.5, 25, 24, 26, 25.5, 27], range: "year" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("PriceChart");
export const probes = [
  choose(
    "Show one stock holding's price line with current price, change and selectable day, week, month, year and all-history ranges",
  ),
  choose(
    "Show my latest soil moisture and its short recent downward trend in a compact strip, with no time-range tabs",
    "Sparkline",
  ),
  write(
    "My Green Fund holding has monthly price samples 98, 99, 98.5, 100, 101, 100.5, 102, 103. Select the month range; derive current price and change from the samples",
  ),
  read("Select the week price range", { address: "p1/range", action: "select" }),
] satisfies Probe[];
