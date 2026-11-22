import { expect, it } from "vitest";
import { cardDeckCopy } from "../../copy";

it("keeps the draw and discard counts distinct and localizes their numbers", () => {
  const cards = [{ title: "A" }, { title: "B" }, { title: "C" }];
  expect(cardDeckCopy(cards)).toMatchObject({
    remaining: "Draw pile: 3",
    discarded: "Discard pile: 0",
    revealed: [],
  });
  expect(
    cardDeckCopy(cards, { kind: "deck", remaining: 0, drawn: [2, 0], discard: [1, 2, 0] }, "ar-EG"),
  ).toEqual({
    remaining: "Draw pile: ٠",
    discarded: "Discard pile: ٣",
    remainingValue: "٠",
    discardedValue: "٣",
    exhausted: true,
    hasDiscards: true,
    revealed: [cards[2], cards[0]],
  });
});
