import { describe, expect, it } from "vitest";
import { components, placeholderTitle, readComponent, wordsFor } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance, type AddressedElement } from "../../../../../test/render";

const { props, fallback, examples, meta, probes } = components.CardDeck;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const part = (name: string) => `home/c1/${name}`;
const sample = examples[0]!;

describe("CardDeck contract", () => {
  it.each(examples)("accepts each example", (example) => expect(props.safeParse(example).success).toBe(true));
  it("fills the six-card minimum from cast titles and neutral placeholders", () => {
    const neutral = fallback({ cast: { things: [], items: [] } });
    expect(neutral.title).toBe(wordsFor().placeholderLabel);
    expect(neutral.cards.map(({ title }) => title)).toEqual(
      Array.from({ length: 6 }, (_, i) => placeholderTitle(i)),
    );
    const things = [{ type: "prompt", fields: ["name", "detail"] }];
    const item = { id: "prompt", type: "prompt", sample: true, name: "First prompt", detail: "A clue" };
    expect(fallback({ cast: { things, items: [item] } }).cards[0]).toEqual({
      title: "First prompt",
      body: "A clue",
    });
    expect(props.safeParse(fallback({ cast: { things, items: [{ ...item, name: 12 }] } })).success).toBe(
      true,
    );
  });
  it("bounds the deck, card text and draw size; rejects stored pile state", () => {
    const card = { title: "x".repeat(36), body: "x".repeat(160), tag: "x".repeat(16) };
    const cards = Array.from({ length: 30 }, () => card);
    const title = "x".repeat(32);
    expect(props.safeParse({ title, cards, drawCount: 3 }).success).toBe(true);
    for (const invalid of [
      { cards: cards.slice(0, 5) },
      { cards: [...cards, card] },
      { cards: [...cards.slice(1), { ...card, title: "x".repeat(37) }] },
      { cards: [...cards.slice(1), { ...card, body: "x".repeat(161) }] },
      { cards: [...cards.slice(1), { ...card, tag: "x".repeat(17) }] },
      { drawCount: 0 },
      { drawCount: 4 },
      { drawCount: 1.5 },
      { style: "other" },
      { discard: [0] },
    ])
      expect(props.safeParse({ title, cards, ...invalid }).success).toBe(false);
  });
  it("reads initial counts without exposing any face-down cards", () => {
    const sample = examples[0]!;
    const lines = readComponent(components.CardDeck, sample, "c1").join("\n");
    expect(lines).toContain("Draw pile: 6");
    expect(lines).toContain("Discard pile: 0");
    for (const { title } of sample.cards) expect(lines).not.toContain(title);
  });
  it("declares density, the core near miss and confirmation for reshuffling", () => {
    expect(meta).toMatchObject({ dense: true, weight: 3, confirmParts: ["reshuffle"] });
    expect(meta.states).toEqual(["empty", "filled", "loading", "success"]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "SwipeStack" }));
  });
});

function partText(node?: AddressedElement): string {
  return node ? [...node.text, ...node.children.map(partText)].join(" ").replace(/\s+/g, " ").trim() : "";
}

it("renders addressed piles and the draw control without leaking faces, also in brief and loading", () => {
  const html = renderInstance("CardDeck", sample, "empty", theme);
  const empty = addressedElements(html);
  expect(partText(empty.get(part("remaining")))).toBe("Draw pile: 6");
  expect(partText(empty.get(part("discard")))).toBe("Discard pile: 0");
  expect(empty.has(part("card"))).toBe(true);
  expect(empty.has(part("draw"))).toBe(true);
  expect(empty.has(part("reshuffle"))).toBe(false);
  for (const { title } of sample.cards) expect(html).not.toContain(title);
  const brief = { ...sample, detail: "brief" };
  expect(addressedElements(renderInstance("CardDeck", brief, "empty", theme)).has(part("discard"))).toBe(
    false,
  );
  const loaded = renderInstance("CardDeck", sample, "loading", theme);
  expect(loaded).toContain('role="progressbar"');
  for (const name of ["title", "remaining", "discard", "draw", "reshuffle"])
    expect(addressedElements(loaded).has(part(name))).toBe(false);
});

function deckController(drawCount = 2, state: "filled" | "loading" = "filled") {
  return createScreenController({
    screen: { id: "home", components: [{ ...sample, drawCount, state, id: "c1", c: "CardDeck" }] },
    defs: components,
    random: () => 0,
  });
}

it("draws without replacement and exposes only the current faces until the deck is exhausted", () => {
  const game = deckController(1);
  try {
    expect(game.read()).toContain("(empty)");
    expect(game.canPress("c1/reshuffle")).toBe(false);
    for (const [index, card] of sample.cards.entries()) {
      expect(game.press("c1/draw").ok).toBe(true);
      const reading = game.read();
      expect(reading).toContain(card.title);
      expect(reading).toContain(`Draw pile: ${sample.cards.length - index - 1}`);
      expect(reading).toContain(`Discard pile: ${index + 1}`);
      for (const hidden of sample.cards.filter((_, other) => index !== other)) {
        expect(reading).not.toContain(hidden.title);
      }
    }
    expect(game.read()).toContain("(success)");
    expect(game.read()).toContain("The draw pile is empty");
    expect(game.canPress("c1/draw")).toBe(false);
    expect(game.press("c1/draw").ok).toBe(false);
    expect(game.canPress("c1/reshuffle")).toBe(true);
  } finally {
    game.dispose();
  }
});

it("requires approval to reshuffle, restores the initial deck, and offers nothing during loading", () => {
  const game = deckController();
  const loading = deckController(2, "loading");
  try {
    expect(loading.canPress("c1/draw")).toBe(false);
    expect(loading.canPress("c1/reshuffle")).toBe(false);
    expect(game.press("c1/draw").ok).toBe(true);
    expect(game.read()).toContain("Check the fern — Care — Feel the soil before you water.");
    expect(game.read()).toContain("Look for roots");
    expect(game.press("c1/reshuffle").ok).toBe(true);
    expect(game.read()).toContain("[confirm/confirm press]");
    expect(game.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
    expect(game.read()).toContain("Discard pile: 2");
    expect(game.press("c1/reshuffle").ok).toBe(true);
    expect(game.press("confirm/confirm").ok).toBe(true);
    expect(game.read()).toContain("Discard pile: 0");
    expect(game.read()).not.toContain("Check the fern");
    expect(game.canPress("c1/draw")).toBe(true);
  } finally {
    game.dispose();
    loading.dispose();
  }
});

it("draws only the remaining cards when the last batch is smaller than requested", () => {
  const game = createScreenController({
    screen: {
      id: "home",
      components: [
        {
          ...sample,
          cards: [...sample.cards, { title: "Final card" }],
          drawCount: 3,
          id: "c1",
          c: "CardDeck",
        },
      ],
    },
    defs: components,
    random: () => 0,
  });
  try {
    expect(game.press("c1/draw").ok).toBe(true);
    expect(game.press("c1/draw").ok).toBe(true);
    expect(game.press("c1/draw").ok).toBe(true);
    expect(game.read()).toContain("Final card");
    expect(game.read()).toContain("Discard pile: 7");
    expect(game.read()).not.toContain(sample.cards[5]!.title);
  } finally {
    game.dispose();
  }
});
