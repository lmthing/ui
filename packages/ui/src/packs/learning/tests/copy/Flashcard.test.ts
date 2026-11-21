import { expect, it } from "vitest";
import { cardsLeft } from "../../copy";

it("formats the count in the requested language and inflects the noun", () => {
  expect(cardsLeft(0)).toBe("0 cards left");
  expect(cardsLeft(1)).toBe("1 card left");
  expect(cardsLeft(2)).toBe("2 cards left");
  expect(cardsLeft(2, "ar-EG")).toBe("٢ cards left");
});
