import { accents, presets, themeName, themeRoles } from "../../catalog/themes";

export type KitThemeName = ReturnType<typeof themeName>;
type KitTheme = Readonly<ReturnType<typeof themeRoles> & { color: string; background: string }>;
const cache = new Map<KitThemeName, KitTheme>();

export function themeFor(name: KitThemeName): KitTheme {
  const cached = cache.get(name);
  if (cached) return cached;
  const [, presetId, mode, accentId] = name.split("_");
  const preset = presets.find(({ id }) => id === presetId);
  const accent = accents.find(({ id }) => id === accentId);
  if (
    !preset ||
    !accent ||
    (mode !== "light" && mode !== "dark") ||
    name !== themeName({ preset: preset.id, accent: accent.id, mode })
  )
    throw new Error(`Unknown kit theme: ${name}`);
  const roles = themeRoles(preset, accent, mode);
  const theme = Object.freeze({ ...roles, color: roles.text, background: roles.bg });
  cache.set(name, theme);
  return theme;
}
