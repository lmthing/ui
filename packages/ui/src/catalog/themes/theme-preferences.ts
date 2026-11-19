import { variantAxes } from "../props";
import type { AxisValue } from "../types";

export type ThemeDensity = AxisValue<"density">;
export type ThemeMotion = "calm" | "lively";
export type ThemePreferences = { density?: ThemeDensity | undefined; motion?: ThemeMotion | undefined };

export function themePreferencesOf(
  { density = variantAxes.density.values[0], motion = "calm" }: ThemePreferences,
  reduceMotion = false,
) {
  return { density, motion: reduceMotion ? "calm" : motion } as const;
}
