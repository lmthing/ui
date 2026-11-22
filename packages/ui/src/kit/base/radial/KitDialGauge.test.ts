import { expect, it } from "vitest";
import { dialRatio } from "./KitDialGauge";

it.each([
  [-1, 0],
  [0, 0],
  [0.35, 0.35],
  [1, 1],
  [2, 1],
  [Infinity, 0],
  [NaN, 0],
])("normalizes ratio %s to %s", (ratio, expected) => expect(dialRatio(ratio)).toBe(expected));
