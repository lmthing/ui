import { z } from "zod";
import { clip, emptyLine, text, thingOf, type CastLike, type Meta, type Probe, type Props } from "../catalog";
import { KitBlock, KitInput } from "../kit";

export const meta = {
  id: "Search",
  group: "input",
  purpose: "Find one thing among many by typing words from its name.",
  pick: "Type a query above a list to find matching things. Not a few fixed filters (Chips), entering one piece of information (Field) or writing several lines (Composer).",
  region: "top",
  weight: 1,
  tier: "phone",
  realPath: "A text query over a list of things in the on-device database.",
  parts: ["root", "field"],
  states: ["filled"],
  actions: { parts: { field: ["type"] } },
  aliases: ["searchbox", "searchbar", "lookup", "find"],
} as const satisfies Meta;

export const props = z.strictObject({ hint: text(40) });

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  // Reuse the shared copy helper's normalization and plural rather than a second vocabulary.
  const line = emptyLine(thingOf(cast)?.type);
  return { hint: line === emptyLine() ? "Search" : clip(`Search ${line.slice(3, -4)}`, 40) };
}

export const examples = [{ hint: "Search plants" }, { hint: "Search clients" }] satisfies z.input<
  typeof props
>[];

export const probes = [
  {
    kind: "choose",
    need: "Let me find any plant by typing part of its name above the list",
    expect: "Search",
  },
  {
    kind: "choose",
    need: "Narrow my plants with a few fixed filters for All, Needs water and Favorites",
    expect: "Chips",
  },
  {
    kind: "write",
    brief: "Let me find plants by typing, with the placeholder Search plants",
    expect: "Search",
  },
  {
    kind: "read",
    screen: 0,
    task: "Look for the fern",
    expect: { address: "s1/field", action: "type" },
  },
] satisfies Probe[];

export function Search({ hint }: Props<typeof props, typeof meta>) {
  return (
    <KitBlock label={hint} inset="none">
      <KitInput kind="search" hint={hint} part="field" />
    </KitBlock>
  );
}
