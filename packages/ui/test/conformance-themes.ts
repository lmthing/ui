import { accents, presets, type ThemeChoice } from "@lmthing/ui/catalog";
import { conformanceThemeSet } from "../scripts/build/check-options";

export const modes = ["light", "dark"] as const;

const accent = accents[0].id;
export const conformanceThemes: readonly ThemeChoice[] =
  conformanceThemeSet(process.env) === "all"
    ? presets.flatMap(({ id: preset }) => modes.map((mode) => ({ preset, mode, accent })))
    : [{ preset: "calm", mode: "light", accent }];
