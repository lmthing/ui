import type { accents } from "./accents";
import type { presets } from "./index";

export type ThemeChoice = {
  preset: (typeof presets)[number]["id"];
  accent: (typeof accents)[number]["id"];
  mode: "light" | "dark";
};
export function themeName({ preset, accent, mode }: ThemeChoice) {
  return `kit_${preset}_${mode}_${accent}` as const;
}
