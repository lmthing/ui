export type ThemeDensity = "comfortable" | "compact";
export type ThemeMotion = "calm" | "lively";
export type ThemePreferences = { density?: ThemeDensity | undefined; motion?: ThemeMotion | undefined };

export function themePreferencesOf(
  { density = "comfortable", motion = "calm" }: ThemePreferences,
  reduceMotion = false,
) {
  return { density, motion: reduceMotion ? "calm" : motion } as const;
}
