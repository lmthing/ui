import type { accents } from "./accents";
import type { presets } from "./index";
import type { ThemePreferences } from "./theme-preferences";

export type ThemeChoice = {
  preset: (typeof presets)[number]["id"];
  accent: (typeof accents)[number]["id"];
  mode: "light" | "dark";
} & ThemePreferences;
export function themeName({ preset, accent, mode }: ThemeChoice) {
  return `kit_${preset}_${mode}_${accent}` as const;
}
