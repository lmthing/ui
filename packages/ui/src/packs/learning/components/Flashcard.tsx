import { z } from "zod";
import * as c from "../../../catalog";

// Core first: SwipeStack/default cannot reveal a back face and rate recall for spaced review.
export const meta = {
  id: "Flashcard",
  status: "draft",
  group: "input",
  purpose: "Recall an answer, reveal it and rate how well you remembered it.",
  pick: "Recall from a prompt, flip to reveal its answer, then rate recall to schedule the next review. Not checked answers (Quiz) or swiping to keep or skip things (SwipeStack).",
  writeHints: ["Write only seed cards. Do not write cards left, flipped state or review dates."],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Cards and their review dates are stored on the device.",
  variants: { surface: ["card", "outlined"], align: ["center", "start"] },
  parts: ["root", "card", "front", "back", "hint", "photo", "left", "again", "hard", "good", "easy"],
  states: ["filled", "empty", "success"],
  actions: {
    parts: { card: ["flip"], again: ["press"], hard: ["press"], good: ["press"], easy: ["press"] },
    when: {
      again: { flipped: true },
      hard: { flipped: true },
      good: { flipped: true },
      easy: { flipped: true },
    },
  },
  read: (input): string[] => {
    const { cards } = input as z.output<typeof props>;
    const card = cards[0];
    return card ? [card.front, ...(card.hint ? [card.hint] : [])] : [];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  cards: z
    .array(
      z.strictObject({
        front: c.text(80),
        back: c.text(160),
        hint: c.text(60).optional(),
        photo: c.photo.optional(),
      }),
    )
    .min(2)
    .max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 6);
  return {
    cards: Array.from({ length: Math.max(2, items.length) }, (_, index) => {
      const item = items[index];
      return {
        front: (item && c.titleOf(item, 80, thing)) ?? c.placeholderTitle(index, lang),
        back: (item && c.detailOf(item, 160, thing)) ?? c.wordsFor(lang).placeholderDetail,
      };
    }),
  };
}

export const examples = [
  {
    cards: [
      {
        front: "What light suits most ferns?",
        back: "Bright, indirect light",
        hint: "Think of a shaded forest floor",
        photo: "lib:plants",
      },
      { front: "What do roots take up?", back: "Water and minerals from the soil" },
    ],
  },
  {
    surface: "outlined",
    align: "start",
    cards: [
      { front: "What should you pack for a long dog walk?", back: "Water, a bowl and waste bags" },
      {
        front: "When the lead goes tight, what comes next?",
        back: "Pause, then continue when the lead relaxes",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Flashcard");
export const probes = [
  choose(
    "Show me a prompt, let me turn it over to see the answer, then rate my recall so I see it again at the right interval.",
  ),
  choose(
    "Let me swipe left or right to keep or skip each candidate shown one at a time. Nothing to reveal.",
    "SwipeStack",
  ),
  write("Make recall cards for 水 → mizu, water (hint: something you drink) and 山 → yama, mountain."),
  read("Flip the current card to see its answer.", { address: "f1/card", action: "flip" }),
] satisfies c.Probe[];
