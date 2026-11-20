import { z } from "zod";
import * as c from "../../../catalog";

const wordParts = ["word_1", "word_2", "word_3", "word_4", "word_5", "word_6", "word_7", "word_8"] as const;

// Core first: Scale/mood captures a level, not several precise words chosen by feeling family.
export const meta = {
  id: "Feelings",
  status: "draft",
  group: "input",
  purpose: "Name up to three precise feelings by choosing words within a family.",
  pick: "Choose a family such as calm or anxious, then toggle up to three precise feeling words. Not one five-point rating (Scale), things that happened (Factors), or physical symptoms (SymptomLog).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The selected words are saved with the day's entry on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root"],
  items: {
    key: "families",
    parts: ["root", "label", ...wordParts],
    nested: { key: "word_controls", parts: { word: { action: "toggle", prop: "on" } } },
  },
  states: ["filled"],
  actions: {
    items: {
      root: ["select"],
      word_1: ["toggle"],
      word_2: ["toggle"],
      word_3: ["toggle"],
      word_4: ["toggle"],
      word_5: ["toggle"],
      word_6: ["toggle"],
      word_7: ["toggle"],
      word_8: ["toggle"],
    },
    when: {
      word_1: { word_1: true },
      word_2: { word_2: true },
      word_3: { word_3: true },
      word_4: { word_4: true },
      word_5: { word_5: true },
      word_6: { word_6: true },
      word_7: { word_7: true },
      word_8: { word_8: true },
    },
  },
  select: { prop: "family", value: "index" },
  writeHints: [
    "Give three to six families, each with three to eight words. Chosen has up to three distinct words from the families; use [] when none are selected.",
  ],
  read: (input, state): string[] => {
    if (state !== "filled") return [];
    const { families } = input as z.output<typeof props>;
    return families.map(
      ({ label, words }, index) =>
        `r${index + 1} ${JSON.stringify(label)}: ${words.map((word, at) => `${wordParts[at]} ${JSON.stringify(word)}`).join(", ")}`,
    );
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    families: z
      .array(z.strictObject({ label: c.text(14), words: z.array(c.text(16)).min(3).max(8) }))
      .min(3)
      .max(6),
    chosen: z.array(c.text(16)).min(0).max(3),
  })
  .refine(
    ({ families, chosen }) =>
      new Set(chosen).size === chosen.length &&
      chosen.every((word) => families.some(({ words }) => words.includes(word))),
    { path: ["chosen"], message: "Choose distinct words from the supplied families" },
  )
  .overwrite((value) => ({
    ...value,
    families: value.families.map((family) => ({
      ...family,
      word_controls: family.words.map((word) => ({ on: value.chosen.includes(word) })),
    })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    families: Array.from({ length: 3 }, (_, index) => {
      const item = items[index];
      return {
        label: (item && c.titleOf(item, 14, thing)) ?? c.placeholderTitle(index, lang),
        words: Array.from({ length: 3 }, (_, at) => c.placeholderTitle(at, lang)),
      };
    }),
    chosen: [],
  };
}

export const examples = [
  {
    families: [
      { label: "Calm", words: ["Settled", "Hopeful", "At ease"] },
      { label: "Anxious", words: ["Restless", "Worried", "On edge"] },
      { label: "Tired", words: ["Drained", "Sleepy", "Heavy"] },
    ],
    chosen: ["Settled", "Hopeful"],
  },
  {
    density: "compact",
    surface: "outlined",
    families: [
      { label: "Happy", words: ["Proud", "Amused", "Grateful", "Delighted"] },
      { label: "Sad", words: ["Lonely", "Tender", "Disappointed"] },
      { label: "Angry", words: ["Irritated", "Frustrated", "Resentful"] },
    ],
    chosen: [],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Feelings");
export const probes = [
  choose(
    "Let me choose a family like anxious first, then mark up to three precise words like restless or worried.",
  ),
  choose(
    "Let me rate how I feel with one of five faces, from very low to very good, no feeling words to select.",
    "Scale",
  ),
  write(
    "Name how I feel: Calm has Settled, Hopeful and At ease; Anxious has Restless, Worried and On edge; Tired has Drained, Sleepy and Heavy. Settled is chosen.",
  ),
  read("Choose the Anxious family.", { address: "f1/r2", action: "select" }),
  read("Within Calm, toggle the already chosen word Hopeful off.", {
    address: "f1/r1/word_2",
    action: "toggle",
  }),
] satisfies c.Probe[];
