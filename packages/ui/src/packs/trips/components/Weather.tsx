import { z } from "zod";
import {
  isoDate,
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
} from "../../../catalog";

// Core first: Stats/default cannot request a place's service-backed forecast with daily conditions.
export const meta = {
  id: "Weather",
  status: "draft",
  group: "data",
  purpose: "See the forecast or typical weather for the place and dates of a trip.",
  pick: "A place's local weather or trip forecast, including conditions and rain chance. Not personal figures (Stats) or a series showing a trend (Sparkline).",
  writeHints: [
    "Write the place and optional trip dates only. A service provides the forecast or typical monthly weather; do not write temperatures or conditions.",
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A weather service provides forecasts and typical monthly weather.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "place", "today", "forecast", "message"],
  // The host's offline case uses the error state with the Empty offline treatment.
  states: ["filled", "loading", "error"],
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    place: text(24),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .refine(({ from, to }) => !from || !to || from <= to, { path: ["to"] });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const item = itemsOf(cast, 1)[0];
  return { place: (item && titleOf(item, 24, thingOf(cast))) ?? placeholderTitle(0, lang) };
}

export const examples = [
  { place: "Tokyo", from: "2027-03-04", to: "2027-03-13" },
  { place: "Reykjavik", density: "compact", surface: "plain" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Weather");
export const probes = [
  choose(
    "Look up the forecast for Reykjavik, with today's high and low and the rain chances on the next few days",
  ),
  choose(
    "Show three summary numbers for my trips: 4 countries, 12 nights and 3 train rides, each with a label",
    "Stats",
  ),
  write(
    "Show the weather for Tokyo from 2027-03-04 to 2027-03-13. Look up the conditions rather than guessing them.",
  ),
] satisfies Probe[];
