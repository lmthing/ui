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
  expect(surface.fill).toBe("surface");
  expect(surface.elevation).toBe(preset.surface === "soft" ? "card" : "flat");
  expect(surface.rule).toBe(preset.surface === "hairline" ? "line" : null);
});
