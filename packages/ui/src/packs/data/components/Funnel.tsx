import { z } from "zod";
import {
  clip,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";

// Core first: Bars/default compares independent amounts and Bars/share divides a whole; neither computes conversion between ordered stages.
export const meta = {
  id: "Funnel",
  status: "draft",
  group: "data",
  tier: "phone",
  pick: "stage-by-stage drop-off and conversion rates across a sequential pipeline. Not independent categories (Bars), 100% part-to-whole shares (Bars[share]), or movable stage cards (Board).",
  purpose:
    "An ordered two-to-six stage conversion breakdown displaying each stage's label, record count and optional monetary value.",
  region: "body",
  weight: 2,
  realPath: "stage counts and totals aggregated from stored records on the device.",
  parts: ["root"],
  items: { key: "stages", parts: ["root"] },
  actions: { items: { root: ["press"] } },
  states: ["filled", "empty", "loading"],
} as const satisfies Meta;
export const props = z.strictObject({
  title: text(32),
  stages: z
    .array(
      z.strictObject({
        label: text(20),
        count: z.number().min(0),
        value: z.number().min(0).optional(),
        goto: screenId.optional(),
      }),
    )
    .min(2)
    .max(6),
  unit: text(12).optional(),
  style: z.enum(["bars", "compact"]).default("bars"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 2);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    title: castTitle(32, 0),
    stages: Array.from({ length: 2 }, (_, index) => ({ label: castTitle(20, index), count: 0 })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("Funnel");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "Bars"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/r1", action: "press" }),
] satisfies Probe[];

export function Funnel(_input: Props<typeof props, typeof meta>) {
  return null;
}
