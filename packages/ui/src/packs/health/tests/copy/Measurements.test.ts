import { describe, expect, it } from "vitest";
import {
  measurementCopy,
  measurementLabels,
  measurementPoints,
  measurementRange,
  measurementRanges,
  measurementReading,
} from "../../copy";

describe("measurement copy", () => {
  it("formats falling, rising, flat and precise readings neutrally", () => {
    expect(measurementCopy([78, 77.5, 77.2, 76.8], "kg", 75)).toEqual({
      latest: "76.8",
      latestLabel: "Latest · kg",
      change: "-1.2 kg since first reading",
      goal: "Goal 75 kg",
    });
    expect(measurementCopy([0, 0, 0, 0], "cm", 0).goal).toBe("Goal 0 cm");
    expect(measurementCopy([1, 2, 3, 4], "cm").change).toBe("+3 cm since first reading");
    expect(measurementCopy([1, 1, 1, 1], "cm").change).toBe("0 cm since first reading");
    expect(measurementCopy([1, 2, 3, 4.12345], "cm").latest).toBe("4.123");
    expect(measurementCopy([1, 2, 3, 4], "cm").goal).toBeUndefined();
  });
  it("bounds weekly windows at the largest series and keeps the latest point and stable ids", () => {
    const points = Array.from({ length: 52 }, (_, index) => index);
    for (const [range, count] of [
      ["month", 4],
      ["quarter", 13],
      ["year", 52],
    ] as const) {
      const window = measurementPoints(points, range);
      expect(window).toHaveLength(count);
      expect(window[0]).toMatchObject({ id: `p${53 - count}`, value: 52 - count, x: 0, label: "Start" });
      expect(window.at(-1)).toMatchObject({ id: "p52", value: 51, label: "Latest" });
      expect(measurementPoints([0, 0, 0, 0], range)).toHaveLength(4);
    }
  });
  it("accepts display labels and wire ranges, with a safe fallback for unknown selections", () => {
    for (const range of measurementRanges) {
      expect(measurementRange(range, "month")).toBe(range);
      expect(measurementRange(measurementLabels[range], "month")).toBe(range);
    }
    expect(measurementRange("week", "quarter")).toBe("quarter");
    expect(measurementRange(undefined, "year")).toBe("year");
  });
  it("includes every computed and fixed visible line in the data-only reading", () => {
    expect(measurementReading([0, 1, 2, 3], "kg", 0)).toEqual([
      "3 kg",
      "Latest · kg",
      "+3 kg since first reading",
      "Goal 0 kg",
      "Month",
      "3 months",
      "Year",
      "Start",
      "Latest",
      "Add measurement",
    ]);
  });
});
