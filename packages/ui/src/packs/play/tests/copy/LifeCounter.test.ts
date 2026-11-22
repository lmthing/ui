import { expect, it } from "vitest";
import { lifeCounterLines } from "../../copy";

it("reads a player's starting total or override and localizes resource numbers", () => {
  expect(
    lifeCounterLines(
      {
        startingLife: 999,
        players: [
          { name: "A", counters: [{ label: "Tokens", value: 3 }] },
          { name: "B", life: 1234, counters: [] },
        ],
      },
      "ar-EG",
    ),
  ).toEqual(["A: ٩٩٩ life", "Tokens: ٣", "B: ١٢٣٤ life"]);
});
