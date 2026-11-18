import { describe, expect, it } from "vitest";
import { component, space } from "../../../catalog";
import { columnHeights } from "./skeleton-shapes";

describe("loading columns", () => {
  it("matches the supplied first filled plot, including its maximum", () => {
    expect(columnHeights([2, 4, 3, 5].map((value) => ({ value })))).toEqual([48, 96, 72, 120]);
  });
  it("keeps zero columns visible at every supported count", () => {
    for (let count = 2; count <= 7; count++) {
      expect(columnHeights(Array.from({ length: count }, () => ({ value: 0 })))).toEqual(
        Array.from({ length: count }, () => space.xs),
      );
    }
  });
  it("retains the plot cap for extreme finite values", () => {
    expect(columnHeights([{ value: Number.MAX_VALUE }, { value: Number.MAX_VALUE / 2 }])).toEqual([
      component.base.barsHeight,
      component.base.barsHeight / 2,
    ]);
  });
});
