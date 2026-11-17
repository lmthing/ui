import type { AccentMeta, PresetMeta } from "../meta";

const toneShare = { light: 0.12, dark: 0.13 } as const;
const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16);

function mix(tone: string, base: string, share: number): string {
  const part = (at: number) =>
    Math.round(channel(tone, at) * share + channel(base, at) * (1 - share))
      .toString(16)
      .padStart(2, "0");
  return `#${part(1)}${part(3)}${part(5)}`;
}

/**
 * Every colour role of one theme: the preset's base roles, the accent's, and a soft tint of each tone
 * (`goodSoft`, `warnSoft`, `badSoft`) mixed from the tone and the card surface, for banners and tinted cards.
 */
export function themeRoles(preset: PresetMeta, accent: AccentMeta, mode: "light" | "dark") {
  const base = preset.roles[mode];
  const share = toneShare[mode];
  return {
    ...base,
    ...accent[mode],
    goodSoft: mix(base.good, base.surface, share),
    warnSoft: mix(base.warn, base.surface, share),
    badSoft: mix(base.bad, base.surface, share),
  };
}
