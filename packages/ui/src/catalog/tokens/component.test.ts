import { expect, it } from "vitest";
import { component, swatchNames } from "./index";
import { presets } from "../themes";

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((pair) => {
      const value = parseInt(pair, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

it("maps every product swatch to a fixed colour", () => {
  expect(Object.keys(component.swatch)).toEqual([...swatchNames]);
  for (const value of Object.values(component.swatch)) expect(value).toMatch(/^#[0-9a-f]{6}$/);
});
it.each(presets)("keeps dot outlines visible on $id light and dark surfaces", (preset) => {
  const border = luminance(component.swatchBorder);
  for (const mode of ["light", "dark"] as const) {
    for (const role of ["surface", "raised"] as const) {
      const surface = luminance(preset.roles[mode][role]);
      expect((Math.max(border, surface) + 0.05) / (Math.min(border, surface) + 0.05)).toBeGreaterThanOrEqual(
        3,
      );
    }
  }
});
