import { expect, it } from "vitest";
import { cardDeckCounts } from "../../copy";

it("keeps the draw and discard counts distinct and localizes their numbers", () => {
  expect(cardDeckCounts(0, 30)).toEqual(["Draw pile: 0", "Discard pile: 30"]);
  expect(cardDeckCounts(5, 1, "ar-EG")).toEqual(["Draw pile: ٥", "Discard pile: ١"]);
});
