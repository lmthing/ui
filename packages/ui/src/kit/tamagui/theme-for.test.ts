import { expect, it } from "vitest";
import { themeName } from "../../catalog/themes";
import { themeFor, type KitThemeName } from "./theme-for";

it("reuses the same immutable palette when only density or motion differ", () => {
  const choice = { preset: "warm", mode: "dark", accent: "sky" } as const;
  const palette = themeFor(themeName(choice));
  expect(themeFor(themeName({ ...choice, density: "compact", motion: "lively" }))).toBe(palette);
  expect(Object.isFrozen(palette)).toBe(true);
  expect(themeFor(themeName({ ...choice, mode: "light" }))).not.toBe(palette);
  expect(themeFor(themeName({ ...choice, accent: "moss" }))).not.toBe(palette);
  expect(themeFor(themeName({ ...choice, preset: "calm" }))).not.toBe(palette);
});

it("rejects an unknown name instead of caching a palette under it", () => {
  expect(() => themeFor("kit_calm_dark_moss_extra" as KitThemeName)).toThrow("Unknown kit theme");
});
