import { expect, it } from "vitest";
import { diceFaceLabel, diceSetupLine, diceSumLine } from "../../copy";

it("uses singular and plural dice labels and the requested number locale", () => {
  expect(diceSetupLine(1, 20)).toBe("1 die · 20 sides");
  expect(diceSetupLine(6, 4)).toBe("6 dice · 4 sides");
  expect(diceSetupLine(2, 8, "en-u-nu-arab")).toBe("٢ dice · ٨ sides");
});

it("labels a blank, rolled and held face without inventing a value", () => {
  expect(diceFaceLabel(1, undefined, false)).toBe("Die 1, not rolled");
  expect(diceFaceLabel(2, 6, false)).toBe("Die 2, showing 6");
  expect(diceFaceLabel(2, 20, true, "en-u-nu-arab")).toBe("Die ٢, showing ٢٠, held");
});

it("omits an unrolled total and reads the computed total at the numeric limit", () => {
  expect(diceSumLine([])).toBeUndefined();
  expect(diceSumLine([1, 4, 2])).toBe("Total 7");
  expect(diceSumLine(Array(6).fill(20), "en-u-nu-arab")).toBe("Total ١٢٠");
});
