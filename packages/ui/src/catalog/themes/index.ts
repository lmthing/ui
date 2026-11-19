import { calm, bold, editorial } from "./presets";

export const presets = [calm, bold, editorial] as const;
export { calm, bold, editorial } from "./presets";
export { accents, moss, sky } from "./accents";
export { themeName, type ThemeChoice } from "./theme-name";
export { kitStyleOf, type KitStyle } from "./kit-style";
export { themeRoles } from "./theme-roles";
export {
  themePreferencesOf,
  type ThemeDensity,
  type ThemeMotion,
  type ThemePreferences,
} from "./theme-preferences";
