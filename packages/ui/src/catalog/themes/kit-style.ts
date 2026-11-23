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
  frame: {
    gutter: SpaceToken;
    field: "filled" | "outlined" | "ruled" | "ink";
    action: "standard" | "block" | "pill" | "glow";
    corner: "md" | "lg";
    displayTitle: boolean;
    rowRule: boolean;
    neutralTint: boolean;
  };
};
const shifts = { sharp: -1, soft: 0, round: 1 } as const;
const frame: KitStyle["frame"] = {
  gutter: "gutter",
  field: "filled",
  action: "standard",
  corner: "md",
  displayTitle: false,
  rowRule: false,
  neutralTint: false,
};
const treatments: Partial<Record<KitStyle["surface"], Partial<KitStyle["frame"]>>> = {
  hairline: { field: "outlined", neutralTint: true },
  accentBlock: { action: "block", displayTitle: true },
  tinted: { action: "pill", corner: "lg" },
  editorial: { gutter: "2xl", field: "ruled", displayTitle: true },
  ruled: { field: "ruled", rowRule: true },
  raised: { action: "glow" },
  monochrome: { field: "ink", neutralTint: true },
};

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
    frame: { ...frame, ...treatments[preset.surface] },
  };
}
