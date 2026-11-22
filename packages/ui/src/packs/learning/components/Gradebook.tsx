import { z } from "zod";
import {
  clip,
  isoDate,
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

// Core first: Stats/default shows independent figures, not computed weighted grades with expandable coursework.
export const meta = {
  id: "Gradebook",
  status: "draft",
  group: "data",
  tier: "phone",
  pick: "summarizing weighted course grades and GPA across graded items. Not tracking homework due dates (Assignments), showing one quiz score (Result), or flat summary counters (Stats).",
  purpose: "See your weighted course grade and how each category contributes.",
  region: "body",
  weight: 3,
  realPath: "coursework grades stored locally on the device or synced from a school LMS host.",
  dense: true,
  parts: ["root"],
  items: { key: "categories", parts: ["root"] },
  actions: { items: { root: ["toggle", "press"] } },
  states: ["filled", "empty", "loading", "error"],
} as const satisfies Meta;
export const props = z.strictObject({
  course: text(32),
  term: text(20).optional(),
  scale: z.enum(["percent", "letter", "gpa"]).default("percent"),
  categories: z
    .array(
      z.strictObject({
        label: text(24),
        weight: z.number().min(0).max(100),
        items: z
          .array(
            z.strictObject({
              title: text(28),
              earned: z.number().min(0).optional(),
              possible: z.number().gt(0),
              date: isoDate.optional(),
              goto: screenId.optional(),
            }),
          )
          .min(1)
          .max(12),
      }),
    )
    .min(1)
    .max(6),
  style: z.enum(["categories", "summary"]).default("categories"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    course: castTitle(32, 0),
    categories: Array.from({ length: 1 }, (_, index) => ({
      label: castTitle(24, index),
      weight: 100,
      items: Array.from({ length: 1 }, (_, index) => ({ title: castTitle(28, index), possible: 0.5 })),
    })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("Gradebook");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "Assignments"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/r1", action: "toggle" }),
] satisfies Probe[];

export function Gradebook(_input: Props<typeof props, typeof meta>) {
  return null;
}
