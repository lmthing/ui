import type { PresetMeta } from "../meta";
import { variants, type FontName, type SpaceToken } from "../tokens";
import type { ThemeDensity } from "./theme-preferences";

export type KitStyle = {
  radiusShift: -1 | 0 | 1;
  fonts: { text: FontName; heading: FontName; number: FontName };
  density: { gap: SpaceToken; rowPad: SpaceToken; cardPad: SpaceToken };
  densityKind: PresetMeta["density"];
  surface: PresetMeta["surface"];
  strong: boolean;
};
const shifts = { sharp: -1, soft: 0, round: 1 } as const;

export function kitStyleOf(preset: PresetMeta, density: ThemeDensity = "comfortable"): KitStyle {
  return {
    radiusShift: shifts[preset.shape],
    fonts: {
      text: preset.font,
      heading: preset.heading ?? (preset.font === "serif" ? "serifHeading" : preset.font),
      number: preset.numbers === "condensed" ? "condensed" : preset.font,
    },
    density: variants.density[density][preset.density],
    densityKind: preset.density,
    surface: preset.surface,
    strong: preset.weight === "strong",
  };
}
