import { describe, expect, it } from "vitest";
import { readResult, resultFigures } from "../../copy";

describe("Result copy", () => {
  it("derives the incorrect count and formats optional zeroes as values", () => {
    expect(resultFigures({ right: 8, of: 10, seconds: 0, points: 0 })).toEqual({
      right: "8",
      wrong: "2",
      total: " of 10",
      seconds: "0:00",
      points: "0",
    });
  });

  it("passes the requested language through to every figure", () => {
    expect(resultFigures({ right: 1234, of: 5678, seconds: 3661, points: 123456 }, "en-u-nu-arab")).toEqual({
      right: "١٢٣٤",
      wrong: "٤٤٤٤",
      total: " of ٥٦٧٨",
      seconds: "١:٠١:٠١",
      points: "١٢٣٤٥٦",
    });
  });

  it("reads the perfect score and retry even without optional figures", () => {
    expect(readResult({ right: 5, of: 5, mistakes: [] }, "success")).toEqual([
      "Perfect score",
      "5 of 5",
      "Right 5",
      "Wrong 0",
      "Try again",
    ]);
  });
});
