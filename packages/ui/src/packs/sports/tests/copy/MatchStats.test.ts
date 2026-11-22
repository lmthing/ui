import { expect, it } from "vitest";
import { matchStatValue } from "../../copy";

it("formats authored percentages and counts in the requested language", () => {
  expect(matchStatValue(58.5, "percent", "en")).toBe("58.5%");
  expect(matchStatValue(58.5, "percent", "de")).toBe("58,5 %");
  expect(matchStatValue(8.5, "count", "de")).toBe("8,5");
});
