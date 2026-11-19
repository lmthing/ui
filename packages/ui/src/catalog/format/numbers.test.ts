import { expect, it } from "vitest";
import { digitsLine, numberLine, percentageLine, pluralForm } from "./numbers";

it("uses the provided language for digits, separators and plural categories", () => {
  expect(numberLine(1100.25, "de")).toBe("1100,25");
  expect(digitsLine(5, 2, "en-u-nu-fullwide")).toBe("０５");
  expect(percentageLine(25, "fr")).toBe("25\u00a0%");
  expect(pluralForm(0)).toBe("other");
  expect(pluralForm(0, "fr")).toBe("one");
});
