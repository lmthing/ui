import { describe, expect, it } from "vitest";
import { accents } from "./accents";
import { presets } from "./index";
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
