import type { AccentMeta, PresetMeta } from "../meta";

const toneShare = { light: 0.12, dark: 0.4 } as const;
const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16);

const minimumTextContrast = 4.5;
const black = "#000000";
const white = "#ffffff";

function luminance(color: string) {
  const linear = (at: number) => {
    const value = channel(color, at) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return linear(1) * 0.2126 + linear(3) * 0.7152 + linear(5) * 0.0722;
}

function onAccentOf(fill: string, preferred: string, presetText: string) {
  const background = luminance(fill);
  const contrast = (value: number) =>
    (Math.max(value, background) + 0.05) / (Math.min(value, background) + 0.05);
  if (contrast(luminance(preferred)) >= minimumTextContrast) return preferred;
  if (contrast(luminance(presetText)) >= minimumTextContrast) return presetText;
  return contrast(0) > contrast(1) ? black : white;
}

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
  // Saturated daytime tones keep dark tints distinct instead of mixing pale semantic foregrounds.
  const tones = preset.roles.light;
  const colors = accent[mode];
  return {
    ...base,
    ...colors,
    onAccent: onAccentOf(colors.accent, colors.onAccent, base.text),
    goodSoft: mix(tones.good, base.surface, share),
    warnSoft: mix(tones.warn, base.surface, share),
    badSoft: mix(tones.bad, base.surface, share),
  };
}
