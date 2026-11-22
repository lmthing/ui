import { z } from "zod";
import {
  clip,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { prompt } from "../../../entry/prompt-MatchStats.generated";

// Core first: Bars (single series) cannot show both teams' values on each metric's mirrored axis.
export const meta = {
  id: "MatchStats",
  status: "draft",
  group: "data",
  tier: "phone",
  pick: prompt.pick,
  purpose: prompt.purpose,
  region: "body",
  weight: 3,
  realPath:
    "match stat totals aggregated from recorded match events on the device or fetched from a sports data service.",
  dense: true,
  variants: { detail: ["full", "brief"] },
  parts: ["root", "period"],
  select: { prop: "periodAt", choices: { period: { prop: "periodOptions" } } },
  actions: { parts: { period: ["select"] }, when: { period: { hasPeriods: true } } },
  states: ["filled", "empty", "loading"],
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    home: text(20),
    away: text(20),
    periods: z.array(text(12)).min(0).max(5),
    periodAt: z.int().min(0).max(4).default(0),
    metrics: z
      .array(
        z.strictObject({
          label: text(24),
          homeValue: z.number().min(0),
          awayValue: z.number().min(0),
          unit: z.enum(["count", "percent"]).default("count"),
        }),
      )
      .min(2)
      .max(10),
  })
  .refine(({ periods, periodAt }) => periodAt < Math.max(1, periods.length), {
    path: ["periodAt"],
    message: "Select a supplied period",
  })
  .overwrite((input) => ({
    ...input,
    hasPeriods: input.periods.length > 0,
    periodOptions: input.periods.map((label, value) => ({ label, value })),
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 2);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    home: castTitle(20, 0),
    away: castTitle(20, 1),
    periods: [],
    metrics: Array.from({ length: 2 }, (_, index) => ({
      label: castTitle(24, index),
      homeValue: 0,
      awayValue: 0,
    })),
  };
}

export const examples = [
  {
    home: "Sunday Kickers",
    away: "River Rovers",
    periods: ["Full match", "First half"],
    metrics: [
      { label: "Possession", homeValue: 58, awayValue: 42, unit: "percent" },
      { label: "Shots", homeValue: 13, awayValue: 8 },
    ],
  },
  {
    home: "Oakfield",
    away: "Fern House",
    periods: [],
    detail: "brief",
    metrics: [
      { label: "Shots on target", homeValue: 4, awayValue: 6 },
      { label: "Fouls", homeValue: 8, awayValue: 8 },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("MatchStats");
export const probes = [
  choose(
    "For today's football match put both teams' possession, shots and fouls side by side, with a paired bar for each statistic.",
  ),
  choose(
    "Chart a single series of daily walks, one bar per day, without any other team or series to compare.",
    "Bars",
  ),
  write(
    "Compare Sunday Kickers and River Rovers for the whole match: possession 58% to 42% and shots 13 to 8. There are no period filters.",
  ),
  read("Switch the comparison to the first half.", { address: "c1/period", action: "select" }),
] satisfies Probe[];

export function MatchStats(_input: Props<typeof props, typeof meta>) {
  return null;
}
