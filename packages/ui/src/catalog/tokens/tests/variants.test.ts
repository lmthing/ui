import { expect, it } from "vitest";
import { variantAxes } from "../../props";
import { presets } from "../../themes";
import { space, variants } from "../index";

it("maps every finish choice to tokens", () => {
  for (const [axis, declaration] of Object.entries(variantAxes)) {
    if (declaration.kind === "finish")
      expect(Object.keys(variants[axis as keyof typeof variants])).toEqual([...declaration.values]);
  }
});

it.each(presets)("maps density, emphasis and surfaces for the $id preset", (preset) => {
  const comfortable = variants.density.comfortable[preset.density];
  const compact = variants.density.compact[preset.density];
  for (const step of ["gap", "rowPad", "cardPad"] as const) {
    expect(space[compact[step]]).toBeLessThan(space[comfortable[step]]);
  }
  expect(variants.emphasis.normal[preset.weight]).toBe(
    preset.weight === "strong" ? variants.emphasis.hero.strong : null,
  );
  expect(variants.emphasis.hero[preset.weight].heading).toBe("700");
  const surface = variants.surface.card[preset.surface];
  for (const mode of ["light", "dark"] as const) {
    expect(preset.roles[mode][surface.fill]).toMatch(/^#[0-9a-f]{6}$/i);
    if (surface.rule) expect(preset.roles[mode][surface.rule]).toMatch(/^#[0-9a-f]{6}$/i);
  }
  expect(["flat", "card", "sheet"]).toContain(surface.elevation);
});
