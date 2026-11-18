import { accents, presets, themeRoles, type ThemeChoice } from "@lmthing/ui/catalog";

// Offline image placeholders use the host theme's soft surfaces, leaving text readable.
function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

export function resolvePhoto(
  ref: string,
  theme: ThemeChoice = { preset: "calm", accent: "moss", mode: "light" },
): string {
  const preset = presets.find((entry) => entry.id === theme.preset) ?? presets[0];
  const accent = accents.find((entry) => entry.id === theme.accent) ?? accents[0];
  const roles = themeRoles(preset, accent, theme.mode);
  const colors = [roles.accentSoft, roles.goodSoft, roles.warnSoft, roles.badSoft, roles.raised, roles.line];
  const value = hash(ref);
  const start = value % colors.length;
  const end = (start + 1 + (Math.floor(value / colors.length) % (colors.length - 1))) % colors.length;
  const [from, to] = [colors[start], colors[end]];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="160" height="90" fill="url(#g)"/><circle cx="118" cy="30" r="14" fill="${roles.surface}" fill-opacity=".35"/><path d="M0 90 L52 46 L86 72 L112 54 L160 90 Z" fill="${roles.text}" fill-opacity=".12"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
