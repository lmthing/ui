import { accents, presets, themeName, themeRoles } from "../../src/catalog";

function luminance(color: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}
export function checkContrast() {
  const scores = presets.flatMap((preset) =>
    (["light", "dark"] as const).flatMap((mode) =>
      accents.map((accent) => {
        const theme = themeRoles(preset, accent, mode);
        const score = {
          name: themeName({ preset: preset.id, mode, accent: accent.id }),
          text: contrast(theme.text, theme.bg),
          muted: contrast(theme.muted, theme.bg),
          onAccent: contrast(theme.onAccent, theme.accent),
          // Body text and each tone's icon or border on that tone's soft tint.
          tintText: Math.min(
            ...(["good", "warn", "bad"] as const).map((t) => contrast(theme.text, theme[`${t}Soft`])),
          ),
          tintTone: Math.min(
            ...(["good", "warn", "bad"] as const).map((t) => contrast(theme[t], theme[`${t}Soft`])),
          ),
        };
        if (
          score.text < 7 ||
          score.muted < 4.5 ||
          score.onAccent < 4.5 ||
          score.tintText < 7 ||
          score.tintTone < 4.5
        ) {
          throw new Error(`Contrast failed: ${JSON.stringify(score)}`);
        }
        return score;
      }),
    ),
  );
  console.log(
    `Contrast passed for ${scores.length} themes. Worst text ${Math.min(...scores.map((s) => s.text)).toFixed(2)}:1; muted ${Math.min(...scores.map((s) => s.muted)).toFixed(2)}:1; on-accent ${Math.min(...scores.map((s) => s.onAccent)).toFixed(2)}:1.`,
  );
}

checkContrast();
