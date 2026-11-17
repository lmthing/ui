import { createTamagui, createTokens } from "tamagui";
import { kitFonts, kitThemes, kitTokens } from "@lmthing/ui/kit";

const themes = Object.fromEntries(
  Object.entries({
    light: kitThemes.kit_calm_light_moss,
    dark: kitThemes.kit_calm_dark_moss,
    ...kitThemes,
  }).map(([name, roles]) => [name, { ...roles, color: roles.text, background: roles.bg }]),
);

export const config = createTamagui({
  tokens: createTokens(kitTokens),
  fonts: kitFonts,
  defaultFont: "humanist",
  themes,
});
