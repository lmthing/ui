import { expect, it } from "vitest";
import { axisClues } from "./axis-clues";

it("accepts only complete axes with visible clues, keeping intentional blank entries", () => {
  const values = ["2 1", null, "3"];
  expect(axisClues(values, 3)).toBe(values);
  for (const invalid of [undefined, [], ["2 1"], ["1", "2", "3", "4"], [null, " ", null]])
    expect(axisClues(invalid, 3)).toBeUndefined();
});
