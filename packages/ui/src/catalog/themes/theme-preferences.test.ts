import { describe, expect, it } from "vitest";
import { kitStyleOf, presets, themeName, themePreferencesOf, type ThemeChoice } from "./index";

describe("theme preferences", () => {
  it("defaults to comfortable and calm without changing the colour theme name", () => {
    const theme = { preset: "calm", accent: "moss", mode: "light" } satisfies ThemeChoice;
    const lively = { ...theme, density: "compact", motion: "lively" } satisfies ThemeChoice;
    expect(themePreferencesOf(theme as ThemeChoice)).toEqual({ density: "comfortable", motion: "calm" });
    expect(themePreferencesOf(lively)).toEqual({ density: "compact", motion: "lively" });
    expect(themeName(lively)).toBe(themeName(theme));
  });

  it("lets reduced motion win independently of density", () => {
    expect(themePreferencesOf({ density: "compact", motion: "lively" }, true)).toEqual({
      density: "compact",
      motion: "calm",
    });
  });

  it.each(presets)(
    "keeps the preset's comfortable spacing and tightens compact spacing for $id",
    (preset) => {
      expect(kitStyleOf(preset).density).toEqual(kitStyleOf(preset, "comfortable").density);
      expect(kitStyleOf(preset, "compact").density).not.toEqual(kitStyleOf(preset).density);
      expect(kitStyleOf(preset, "compact").fonts).toEqual(kitStyleOf(preset).fonts);
    },
  );
});
