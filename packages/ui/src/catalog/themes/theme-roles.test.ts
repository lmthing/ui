import { describe, expect, it } from "vitest";
import { accents } from "./accents";
import { minimal, mono, presets } from "./index";
import { themeRoles } from "./theme-roles";

function luminance(hex: string) {
  const values = [1, 3, 5].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

describe("themeRoles semantic surfaces", () => {
  it.each(presets)("keeps all semantic text readable in $id and both modes", (preset) => {
    for (const accent of accents) {
      for (const mode of ["light", "dark"] as const) {
        const roles = themeRoles(preset, accent, mode);
        expect(roles.accent).toBe(accent[mode].accent);
        for (const tone of ["good", "warn", "bad"] as const) {
          const fill = roles[`${tone}Soft`];
          expect(contrast(roles.text, fill)).toBeGreaterThanOrEqual(7);
          expect(contrast(roles.muted, fill)).toBeGreaterThanOrEqual(4.5);
          expect(contrast(roles[tone], fill)).toBeGreaterThanOrEqual(4.5);
          expect(fill).not.toBe(roles.surface);
        }
      }
    }
  });
});

describe("themeRoles control labels", () => {
  const cases = presets.flatMap((preset) =>
    accents.flatMap((accent) => (["light", "dark"] as const).map((mode) => ({ preset, accent, mode }))),
  );
  it.each(cases)("$preset.id / $accent.id / $mode", ({ preset, accent, mode }) => {
    const roles = themeRoles(preset, accent, mode);
    expect(contrast(roles.text, roles.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(roles.muted, roles.bg)).toBeGreaterThanOrEqual(4.5);
    expect(roles.onAccent).toBe(accent[mode].onAccent);
    // Primary button, selected pill, and count badge share the solid pair.
    expect(contrast(roles.onAccent, roles.accent)).toBeGreaterThanOrEqual(4.5);
    // Secondary button and accent badge/selected custom chip use the soft fill.
    expect(contrast(roles.accent, roles.accentSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(roles.text, roles.accentSoft)).toBeGreaterThanOrEqual(4.5);
    // Segments use muted text on raised (idle) and body text on surface (selected).
    expect(contrast(roles.muted, roles.raised)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(roles.text, roles.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("chooses a passing fallback when the preferred on-accent role fails", () => {
    const [preset] = presets;
    const [accent] = accents;
    const darkOnDark = { ...accent, light: { ...accent.light, onAccent: preset.roles.light.text } };
    const resolved = themeRoles(preset, darkOnDark, "light");
    expect(resolved.onAccent).not.toBe(darkOnDark.light.onAccent);
    expect(contrast(resolved.onAccent, resolved.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([minimal, mono])(
    "uses a neutral soft accent fill in $id without losing status colors",
    (preset) => {
      for (const accent of accents) {
        for (const mode of ["light", "dark"] as const) {
          const roles = themeRoles(preset, accent, mode);
          expect(roles.accentSoft).toBe(preset.roles[mode].raised);
          expect(roles.accent).toBe(accent[mode].accent);
          expect(roles.badSoft).not.toBe(roles.raised);
        }
      }
    },
  );

  it.each(["fresh", "playful", "soft"] as const)("separates dark Moss controls from %s cards", (id) => {
    const preset = presets.find((preset) => preset.id === id)!;
    const roles = themeRoles(preset, accents[0], "dark");
    expect(contrast(roles.accentSoft, roles.surface)).toBeGreaterThanOrEqual(1.4);
  });
});
