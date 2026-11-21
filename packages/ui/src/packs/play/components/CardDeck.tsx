import { z } from "zod";
import * as c from "../../../catalog";
import { cardDeckCounts } from "../copy";

// Core first: SwipeStack/default sorts cards by keep or skip, not random finite draws and reshuffles.
export const meta = {
  id: "CardDeck",
  status: "draft",
  group: "action",
  purpose: "Draw cards at random without replacement and reshuffle the discards when needed.",
  pick: "Randomly draw one to three cards without replacement from a finite deck. Not keep-or-skip sorting (SwipeStack), a spinner with repeats (Spinner), or host-read questions (Trivia).",
  writeHints: [
    "Write the authored deck and draw size. Never write shuffle order, current draws, or pile counts.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Device entropy drives the local draw and discard piles; outcomes persist on one phone.",
  parts: ["root", "title", "remaining", "discard", "card", "draw", "reshuffle"],
  states: ["empty", "filled", "loading", "success"],
  actions: { parts: { draw: ["press"], reshuffle: ["press"] } },
  confirmParts: ["reshuffle"],
  emptyActions: ["draw.press"],
  successActions: ["reshuffle.press"],
  read: (input, state, lang) => {
    if (state === "loading") return [];
    const { title, cards } = input as z.output<typeof props>;
    return [title, ...cardDeckCounts(cards.length, 0, lang)];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  title: c.text(32),
  cards: z
    .array(
      z.strictObject({
        title: c.text(36),
        body: c.text(160).optional(),
        tag: c.text(16).optional(),
      }),
    )
    .min(6)
    .max(30),
  drawCount: z.int().min(1).max(3).default(1),
  style: z.enum(["stack", "fan"]).default("stack"),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const cards: z.input<typeof props>["cards"] = c.itemsOf(cast, 6).map((item, i) => {
    const body = c.detailOf(item, 160, thing);
    return { title: c.titleOf(item, 36, thing) ?? c.placeholderTitle(i, lang), ...(body ? { body } : {}) };
  });
  while (cards.length < 6) cards.push({ title: c.placeholderTitle(cards.length, lang) });
  return { title: c.clip(thing?.type.trim() ?? "", 32) || c.wordsFor(lang).placeholderLabel, cards };
}

export const examples = [
  {
    title: "Garden challenge deck",
    cards: [
      { title: "Check the fern", body: "Feel the soil before you water.", tag: "Care" },
      ...["Find a new leaf", "Look for roots", "Turn a pot", "Name a seed", "Find a shaded spot"].map(
        (title) => ({ title }),
      ),
    ],
  },
  {
    title: "Walk break deck",
    drawCount: 3,
    style: "fan",
    cards: [
      "Name a route",
      "Take a water break",
      "Find a shady loop",
      "Spot a bench",
      "Pick a park",
      "Name a dog trick",
    ].map((title) => ({ title })),
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CardDeck");
export const probes = [
  choose(
    "Draw three prompt cards per tap from my shuffled deck and never repeat a card until I reshuffle the discards.",
  ),
  choose("Show these cards in order so I can swipe each one to keep it or skip it.", "SwipeStack"),
  write(
    "Make a Walk break deck. Draw two at a time: Name a route, Take a water break, Find a shady loop, Spot a bench, Pick a park, Name a dog trick.",
  ),
  read("Draw cards without putting them back", { address: "c1/draw", action: "press" }),
] satisfies c.Probe[];
