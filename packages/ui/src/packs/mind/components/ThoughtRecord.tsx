import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Composer/entry gives one free-form box, not a guided reframe with thinking traps and before/after mood.
export const meta = {
  id: "ThoughtRecord",
  status: "draft",
  group: "input",
  purpose: "Reflect on a difficult thought and find a more balanced way to see it.",
  pick: "A guided thought record: what happened, automatic thought, thinking traps, balanced reframe, and before and after mood. Not a free-form journal (Composer), browsing past entries (Entries), or naming feelings (Feelings).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Reflection prompts and responses are stored privately on the device.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: {
    "detail.brief": { hides: ["prompt", "situation", "situation_label", "moodBefore", "moodAfter", "delta"] },
  },
  parts: [
    "root",
    "title",
    "prompt",
    "situation",
    "situation_label",
    "thought",
    "thought_label",
    "traps",
    "traps_label",
    "reframe",
    "reframe_label",
    "moodBefore",
    "moodAfter",
    "delta",
    "save",
    "save_label",
    "success",
  ],
  items: { key: "distortions", parts: ["root", "label"] },
  states: ["filled", "empty", "loading", "success"],
  actions: {
    parts: {
      situation: ["type"],
      thought: ["type"],
      reframe: ["type"],
      moodBefore: ["select"],
      moodAfter: ["select"],
      save: ["press"],
    },
    items: { root: ["toggle"] },
    when: { situation: { detail: "full" }, moodBefore: { detail: "full" }, moodAfter: { detail: "full" } },
  },
  writeHints: [
    'Use detail "brief" for the short exercise with just the thought, thinking traps, and reframe. Leave unrequested axes null.',
    "Mood ratings are whole numbers 1–5. Never supply a mood difference; the app computes it.",
  ],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  prompt: c.text(80).optional(),
  situation: c.text(200).optional(),
  thought: c.text(200).optional(),
  distortions: z
    .array(z.strictObject({ label: c.text(20), on: z.boolean() }))
    .min(3)
    .max(8),
  reframe: c.text(240).optional(),
  moodBefore: z.int().min(1).max(5).optional(),
  moodAfter: z.int().min(1).max(5).optional(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  const prompt = items[0] && c.detailOf(items[0], 80, thing);
  const distortions = [0, 1, 2].map((index) => {
    const item = items[index];
    return { label: (item && c.titleOf(item, 20, thing)) ?? c.placeholderTitle(index, lang), on: false };
  });
  return { prompt, distortions };
}

export const examples = [
  {
    prompt: "What else might explain what happened?",
    situation: "I found a brown leaf on my fern.",
    thought: "I always get plant care wrong.",
    distortions: [
      { label: "All-or-nothing", on: true },
      { label: "Fortune-telling", on: false },
      { label: "Catastrophizing", on: false },
    ],
    reframe: "One brown leaf doesn't tell me how the whole plant is doing.",
    moodBefore: 2,
    moodAfter: 4,
  },
  {
    detail: "brief",
    thought: "A canceled walk means I let everyone down.",
    distortions: [
      { label: "All-or-nothing", on: false },
      { label: "Mind reading", on: true },
      { label: "Personalizing", on: false },
    ],
    reframe: "The forecast changed. Rescheduling was the safer call.",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ThoughtRecord");
export const probes = [
  choose(
    "Guide me through a CBT reflection: write what happened and my first thought, spot thinking traps, write a balanced alternative, and compare how I feel before and after.",
  ),
  choose(
    "Give me one big box to write several paragraphs in today's private journal. No separate questions, ratings or choices.",
    "Composer",
  ),
  write(
    "Build a guided CBT thought record with the prompt What else might explain what happened?, traps All-or-nothing, Mind reading and Personalizing, and mood ratings of 2 before and 4 after.",
  ),
  {
    ...write(
      "Make a short CBT reframing exercise with just my automatic thought, the traps All-or-nothing, Mind reading and Personalizing, and a balanced reframe. Skip the situation and both mood ratings.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Save this completed reflection.", { address: "t1/save", action: "press" }),
] satisfies c.Probe[];
