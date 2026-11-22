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
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";

// Core first: Steps/default guides the person through ordered steps, not airline scans, bags or carousel assignments.
export const meta = {
  id: "BagTracker",
  status: "draft",
  group: "data",
  tier: "service",
  pick: "Track several checked bags by tag across airline scan checkpoints. Not guided steps (Steps), trip packing (PackingList), parcels (DeliveryTracker) or retail orders (OrderStatus).",
  purpose: "See where my checked bags were scanned and where to collect them.",
  region: "body",
  weight: 2,
  realPath:
    "baggage custody scans and carousel assignments synced from the airline's baggage-handling service.",
  parts: ["root", "refresh", "report"],
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"], surface: ["card", "plain"] },
  items: { key: "bags", parts: ["root"] },
  actions: { parts: { refresh: ["press"], report: ["press"] }, items: { root: ["select"] } },
  confirmParts: ["report"],
  states: ["filled", "empty", "loading", "success", "error"],
} as const satisfies Meta;
export const props = z.strictObject({
  ...variantProps(meta.variants),
  bags: z
    .array(
      z.strictObject({
        tag: text(16),
        label: text(24).optional(),
        weight: text(12).optional(),
        flight: text(10).optional(),
        carousel: text(12).optional(),
        steps: z
          .array(
            z.strictObject({
              stage: z.enum(["checked_in", "security", "loaded", "in_transit", "unloaded", "carousel"]),
              at: text(16).optional(),
              location: text(24).optional(),
              done: z.boolean(),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .min(1)
    .max(4),
  reportGoto: screenId.optional(),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    bags: Array.from({ length: 1 }, (_, index) => ({
      tag: castTitle(16, index),
      steps: Array.from({ length: 1 }, () => ({ stage: "checked_in", done: false })),
    })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("BagTracker");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "DeliveryTracker"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/refresh", action: "press" }),
] satisfies Probe[];

export function BagTracker(_input: Props<typeof props, typeof meta>) {
  return null;
}
