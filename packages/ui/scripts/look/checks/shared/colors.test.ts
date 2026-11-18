import { expect, it } from "vitest";
import { rgb, lum, ratio } from "./colors";

it("parses the original RGB formats, alpha defaults and unknown colours", () => {
  expect(rgb("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30, a: 1 });
  expect(rgb("rgba(10,20,30,0.4)")).toEqual({ r: 10, g: 20, b: 30, a: 0.4 });
  expect(rgb("rgb(10 20 30 / 0.4)")).toEqual({ r: 10, g: 20, b: 30, a: 0.4 });
  expect(rgb(null)).toBeNull();
  expect(rgb("transparent")).toBeNull();
});
it("keeps the original luminance and contrast thresholds", () => {
  const black = rgb("rgb(0,0,0)")!,
    white = rgb("rgb(255,255,255)")!;
  expect(lum(black)).toBe(0);
  expect(lum(white)).toBe(1);
  expect(ratio(black, white)).toBe(21);
  expect(ratio(white, black)).toBe(21);
  expect(ratio(black, black)).toBe(1);
});
