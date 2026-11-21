import { z } from "zod";
import {
  probesFor,
  clip,
  searchLine,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitRow, KitInput, useVariant } from "../kit";

export const meta = {
  id: "Search",
  group: "input",
  purpose: "Find one thing among many by typing words from its name.",
  pick: "Type a query above a list to find matching things. Not a few fixed filters (Chips), entering one piece of information (Field) or writing several lines (Composer).",
  region: "top",
  weight: 1,
  tier: "phone",
  realPath: "A text query over a list of things in the on-device database.",
  variants: { density: ["comfortable", "compact"] },
  writeHints: ['Use density "compact" only when asked for a tighter search bar.'],
  parts: ["root", "field"],
  states: ["filled"],
  actions: { parts: { field: ["type"] } },
} as const satisfies Meta;

export const props = z.strictObject({ ...variantProps(meta.variants), hint: text(40) });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  // Reuse the shared copy helper's normalization and plural rather than a second vocabulary.
  return { hint: clip(searchLine(thingOf(cast)?.type, lang), 40) };
}

export const examples = [
  { hint: "Search plants" },
  { hint: "Search clients" },
  { hint: "Search plants", density: "compact" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Search");
export const probes = [
  choose("Let me find any plant by typing part of its name above the list"),
  choose("Narrow my plants with a few fixed filters for All, Needs water and Favorites", "Chips"),
  write("Let me find plants by typing, with the placeholder Search plants"),
  {
    ...write("Put a compact search bar above my walks so it takes up less room. Say Search walks."),
    variant: { axis: "density", value: "compact" },
  },
  read("Look for the fern", { address: "s1/field", action: "type" }),
] satisfies Probe[];

export function Search({ hint, density: requested }: Props<typeof props, typeof meta>) {
  const density = useVariant("density", meta.variants.density, requested);
  const compact = density === "compact";
  return (
    <KitRow label={hint} part="root" inset="none" density={density} inline={compact}>
      <KitInput kind="search" hint={hint} part="field" compact={compact} />
    </KitRow>
  );
}
