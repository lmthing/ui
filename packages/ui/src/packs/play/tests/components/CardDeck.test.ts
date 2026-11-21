import { describe, expect, it } from "vitest";
import { components, placeholderTitle, readComponent, wordsFor } from "@lmthing/ui/catalog";

const { props, fallback, examples, meta, probes } = components.CardDeck;

describe("CardDeck draft", () => {
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
    const lines = readComponent(components.CardDeck, examples[0], "c1").join("\n");
    expect(lines).toContain("Draw pile: 6");
    expect(lines).toContain("Discard pile: 0");
    for (const { title } of examples[0].cards) expect(lines).not.toContain(title);
  });
  it("declares density, the core near miss and confirmation for reshuffling", () => {
    expect(meta).toMatchObject({ dense: true, weight: 3, confirmParts: ["reshuffle"] });
    expect(meta.states).toEqual(["empty", "filled", "loading", "success"]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "SwipeStack" }));
  });
});
