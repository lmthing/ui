import { expect, it } from "vitest";
import { triviaPointsCopy } from "../../copy";

it("formats point values with language-aware numbers and grammar", () => {
  expect(triviaPointsCopy(1, "en").line).toBe("1 point");
  expect(triviaPointsCopy(20, "en")).toEqual({
    line: "20 points",
    before: "",
    value: "20",
    after: " points",
  });
  const value = new Intl.NumberFormat("ar").format(2);
  expect(triviaPointsCopy(2, "ar")).toMatchObject({ line: `${value} points`, value });
});
