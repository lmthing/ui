import { addTheme, createTamagui, createTokens } from "tamagui";
import { accents, presets, themeName, type ThemeChoice } from "@lmthing/ui/catalog";
import { kitFonts, kitTokens, themeFor, type KitThemeName } from "@lmthing/ui/kit";
import { modes, screenPresets } from "./app/overview/gallery-data";

export function controlsTheme(query: URLSearchParams): ThemeChoice {
  return {
    preset: presets.find(({ id }) => id === query.get("preset"))?.id ?? "calm",
    accent: accents.find(({ id }) => id === query.get("accent"))?.id ?? "moss",
    mode: query.get("mode") === "dark" ? "dark" : "light",
  };
}

export function gridThemes(preset?: string | null, mode?: string | null) {
  return presets
    .filter(({ id }) => !preset || id === preset)
    .flatMap(({ id }) =>
      modes
        .filter((value) => !mode || value === mode)
        .map((value) => ({ preset: id, mode: value, accent: accents[0].id })),
    );
}

function initialThemeNames(query: URLSearchParams) {
  const names = new Set<KitThemeName>(["kit_calm_light_moss"]);
  if (query.has("motion")) return names;
  if (query.has("controls")) names.add(themeName(controlsTheme(query)));
  else if (!query.has("runtime") && query.get("c") && !query.has("variant-sheet")) {
    const mode = query.get("mode");
    if (Number(query.get("w"))) {
      const selectedMode = mode === "dark" ? "dark" : "light";
      names.add(themeName({ preset: "calm", accent: accents[0].id, mode: selectedMode }));
      for (const { id: preset } of screenPresets(query.getAll("preset")))
        names.add(themeName({ preset, accent: accents[0].id, mode: selectedMode }));
    } else {
      for (const choice of gridThemes(query.get("preset"), mode)) names.add(themeName(choice));
    }
  }
  return names;
}

const names = initialThemeNames(new URLSearchParams(globalThis.location?.search ?? ""));

export const config = createTamagui({
  tokens: createTokens(kitTokens),
  fonts: kitFonts,
  defaultFont: "humanist",
  themes: {
    light: themeFor("kit_calm_light_moss"),
    dark: themeFor("kit_calm_dark_moss"),
    ...Object.fromEntries([...names].map((name) => [name, themeFor(name)])),
  },
});

export function registerGridThemes() {
  // An overview starts with one preview theme. Register the others before an expansion renders.
  for (const choice of gridThemes()) {
    const name = themeName(choice);
    if (!Object.hasOwn(config.themes, name)) addTheme({ name, theme: themeFor(name) });
  }
}
