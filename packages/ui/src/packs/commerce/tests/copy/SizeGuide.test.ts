import { expect, it } from "vitest";
import { fitLine, measurementLine } from "../../copy";

it("uses the exact inch conversion, rounds converted readings, and localizes the decimal", () => {
  expect(measurementLine(2.54, "cm", "in", "en")).toBe("1");
  expect(measurementLine(1.5, "in", "cm", "fr")).toBe("3,81");
  expect(measurementLine(1, "cm", "in", "en")).toBe("0.39");
  expect(measurementLine(0, "in", "cm", "en")).toBe("0");
  expect(measurementLine(1.123, "in", "in", "en")).toBe("1.123");
});

it("reads both endpoints and the true-to-size band", () => {
  expect([1, 2.49, 2.5, 3, 3.5, 3.51, 5].map((score) => fitLine(score))).toEqual([
    "Runs small",
    "Runs small",
    "True to size",
    "True to size",
    "True to size",
    "Runs large",
    "Runs large",
  ]);
});
