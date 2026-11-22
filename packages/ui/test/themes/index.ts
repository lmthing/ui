import type { ThemeChoice } from "@lmthing/ui/catalog";

export const modes = ["light", "dark"] as const;

export function conformanceThemeSet(env: NodeJS.ProcessEnv) {
  return env.UI_TEST_THEMES === "all" ? "all" : "calm-light";
}

export function conformanceThemes(
  presets: readonly { id: ThemeChoice["preset"] }[],
  accent: ThemeChoice["accent"],
): ThemeChoice[] {
  return conformanceThemeSet(process.env) === "all"
    ? presets.flatMap(({ id: preset }) => modes.map((mode) => ({ preset, mode, accent })))
    : [{ preset: "calm", mode: "light", accent }];
}
