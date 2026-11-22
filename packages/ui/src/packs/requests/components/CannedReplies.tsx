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

// Core first: Composer[reply] edits one draft but cannot browse, preview or insert a saved reply template.
export const meta = {
  id: "CannedReplies",
  status: "draft",
  group: "input",
  tier: "phone",
  pick: "selecting and inserting reusable support or maintenance reply templates into a draft. Not typing a blank reply (Composer), browsing generic rows (List), or displaying the request stream (RequestThread).",
  purpose: "Find a saved reply and put it in a support draft without sending it.",
  region: "body",
  weight: 3,
  realPath:
    "reusable reply templates saved on the operator's device or shared team library; sending still runs through RequestThread.",
  dense: true,
  parts: ["root", "category"],
  items: { key: "templates", parts: ["root", "insert"] },
  actions: { parts: { category: ["select"] }, items: { insert: ["press"], root: ["press"] } },
  states: ["filled", "empty", "loading"],
} as const satisfies Meta;
export const props = z.strictObject({
  categories: z.array(text(16)).min(0).max(5),
  templates: z
    .array(z.strictObject({ title: text(28), category: text(16).optional(), body: text(240) }))
    .min(1)
    .max(12),
  activeCategory: text(16).optional(),
  style: z.enum(["list", "compact"]).default("list"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    categories: Array.from({ length: 0 }, (_, index) => castTitle(16, index)),
    templates: Array.from({ length: 1 }, (_, index) => ({
      title: castTitle(28, index),
      body: castTitle(240, index),
    })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("CannedReplies");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "Composer"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/category", action: "select" }),
] satisfies Probe[];

export function CannedReplies(_input: Props<typeof props, typeof meta>) {
  return null;
}
