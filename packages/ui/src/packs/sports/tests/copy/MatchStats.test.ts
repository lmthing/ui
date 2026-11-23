import { expect, it } from "vitest";
import { matchStatValue, mirroredShares } from "../../copy";

it("formats authored percentages and counts in the requested language", () => {
  expect(matchStatValue(58.5, "percent", "en")).toBe("58.5%");
  expect(matchStatValue(58.5, "percent", "de")).toBe("58,5 %");
  expect(matchStatValue(8.5, "count", "de")).toBe("8,5");
});

it("uses a shared scale for each pair and handles ties, zero and overflow", () => {
  const [home, away] = mirroredShares(58, 42);
  expect(home).toBeCloseTo(0.58);
  expect(away).toBeCloseTo(0.42);
  expect(mirroredShares(0, 0)).toEqual([0, 0]);
  expect(mirroredShares(0, 2)).toEqual([0, 1]);
  expect(mirroredShares(Number.MAX_VALUE, Number.MAX_VALUE)).toEqual([0.5, 0.5]);
});
