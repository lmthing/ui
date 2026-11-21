import { describe, expect, it } from "vitest";
import { bulkSelected } from "../../copy";

describe("BulkActions copy", () => {
  it.each([
    [0, "0 selected"],
    [1, "1 selected"],
    [20, "20 selected"],
  ])("formats the selection count %i", (count, expected) => {
    expect(bulkSelected(count)).toBe(expected);
  });

  it("uses the locale for digits when the words fall back to English", () => {
    expect(bulkSelected(12, "en-US-u-nu-arab")).toBe("١٢ selected");
  });
});
