import type { PresetMeta } from "../meta";
import type { FontName, SpaceToken } from "../tokens";

export type KitStyle = {
  radiusShift: -1 | 0 | 1;
  fonts: { text: FontName; heading: FontName; number: FontName };
  density: { gap: SpaceToken; rowPad: SpaceToken; cardPad: SpaceToken };
  surface: PresetMeta["surface"];
  strong: boolean;
};
const densities = {
  compact: { gap: "sm", rowPad: "sm", cardPad: "md" },
  regular: { gap: "sm", rowPad: "md", cardPad: "lg" },
  airy: { gap: "md", rowPad: "md", cardPad: "xl" },
} as const;
const shifts = { sharp: -1, soft: 0, round: 1 } as const;

export function kitStyleOf(preset: PresetMeta): KitStyle {
  return {
    radiusShift: shifts[preset.shape],
    fonts: {
      text: preset.font,
      heading: preset.font === "serif" ? "serifHeading" : preset.font,
      number: preset.numbers === "condensed" ? "condensed" : preset.font,
    },
    density: densities[preset.density],
    surface: preset.surface,
    strong: preset.weight === "strong",
  };
}
