import { z } from "zod";
import {
  clip,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";

// Core first: FilterBar/default changes individual filters but cannot save, switch, or remove named query and layout presets.
export const meta = {
  id: "SavedViews",
  status: "draft",
  group: "input",
  tier: "phone",
  pick: "switching, saving or managing named query presets across records. Not ephemeral query controls (FilterBar), single-axis tags (Chips), or fixed screen tabs (Segmented).",
  purpose: "Switch among named filter, sort and layout presets, and manage them.",
  region: "body",
  weight: 2,
  realPath: "saved filter and sort presets stored locally on the device.",
  parts: ["root", "save"],
  items: { key: "views", parts: ["root", "remove"] },
  actions: { parts: { save: ["press"] }, items: { root: ["select"], remove: ["press"] } },
  confirmParts: ["remove"],
  states: ["filled", "empty", "loading", "success"],
} as const satisfies Meta;
export const props = z.strictObject({
  views: z
    .array(
      z.strictObject({
        id: text(24).meta({ kind: undefined }),
        label: text(20),
        summary: text(36).optional(),
        layout: z.enum(["table", "cards", "board"]).optional(),
      }),
    )
    .min(1)
    .max(6),
  activeId: text(24).optional(),
  canSave: z.boolean().default(true),
  style: z.enum(["chips", "list"]).default("chips"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    views: Array.from({ length: 1 }, (_, index) => ({
      id: castTitle(24, index),
      label: castTitle(20, index),
    })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("SavedViews");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "FilterBar"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/save", action: "press" }),
] satisfies Probe[];

export function SavedViews(_input: Props<typeof props, typeof meta>) {
  return null;
}
