import { describe, expect, it } from "vitest";
import { feelingCountLine, feelingPlaceholder, readFeelings } from "../../copy";

describe("Feelings copy", () => {
  it("formats counts and distinct neutral fallback choices", () => {
    expect(feelingCountLine(0, "en-GB")).toBe("remaining 0");
    expect(feelingCountLine(3, "en")).toBe("remaining 3");
    expect(feelingPlaceholder(1, 2, "en")).toBe("Item two · 3");
    expect(feelingPlaceholder(2, 0, "en")).toBe("Item three · 1");
  });

  it("assigns labels to projected word parts and only describes an empty active family", () => {
    const rows = [
      { label: "Calm", word_controls: [{ label: "At ease" }] },
      { label: "Tired", word_controls: [] },
    ];
    expect(readFeelings(rows, 0, true, "en")).toEqual([
      '"Name what you feel"',
      '"Choose a family, then pick words that fit."',
      'r1 "Calm": word_1 "At ease"',
      'r2 "Tired"',
    ]);
    expect(readFeelings([{ ...rows[1]!, label: "Calm" }, rows[1]!], 1, false, "en")).toEqual([
      '"Name what you feel"',
      'r1 "Calm"',
      'r2 "Tired": "No additional words in this family."',
    ]);
  });
});
