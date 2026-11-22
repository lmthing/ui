import { expect, it } from "vitest";
import { accents, presets, themeRoles, type ThemeChoice } from "@lmthing/ui/catalog";
import { resolvePhoto } from "./photos";

const decode = (theme?: ThemeChoice, ref = "lib:plants") => atob(resolvePhoto(ref, theme).split(",")[1]!);

function luminance(hex: string, overlay?: string, share = 0) {
  const channels = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16);
    const value =
      (overlay ? channel * (1 - share) + parseInt(overlay.slice(start, start + 2), 16) * share : channel) /
      255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

it("uses stable, distinct theme-based placeholders for photo tags", () => {
  const refs = ["lib:plants", "lib:dogs", "lib:people", "lib:room", "lib:walk", "local:1"];
  const images = refs.map((ref) => resolvePhoto(ref));
  expect(new Set(images).size).toBe(refs.length);
  expect(resolvePhoto(refs[0]!)).toBe(images[0]);
  expect(decode()).toContain('viewBox="0 0 160 90"');
});

it("uses a fern cue for the plant flashcard without changing other photo fixtures", () => {
  const ref = "lib:plants";
  const card = atob(resolvePhoto(ref, undefined, "Flashcard").split(",")[1]!);
  expect(card).toContain('stroke="currentColor"');
  expect(card).not.toContain('id="g"');
  expect(resolvePhoto(ref, undefined, "Quiz")).toBe(resolvePhoto(ref));
  expect(resolvePhoto("lib:dogs", undefined, "Flashcard")).toBe(resolvePhoto("lib:dogs"));
});

it("uses only catalog roles in every theme and keeps text readable at both gradient stops", () => {
  for (const preset of presets)
    for (const accent of accents)
      for (const mode of ["light", "dark"] as const) {
        const roles = themeRoles(preset, accent, mode);
        for (const ref of Array.from({ length: 36 }, (_, index) => `lib:fixture_${index}`)) {
          const svg = decode({ preset: preset.id, accent: accent.id, mode }, ref);
          for (const color of svg.match(/#[a-f0-9]{6}/g) ?? []) expect(Object.values(roles)).toContain(color);
          for (const [, stop] of svg.matchAll(/stop-color="([^"]+)"/g)) {
            for (const [overlay, share] of [
              [undefined, 0],
              [roles.text, 0.12],
              [roles.surface, 0.35],
            ] as const) {
              const levels = [luminance(roles.text), luminance(stop!, overlay, share)].sort((a, b) => a - b);
              expect((levels[1]! + 0.05) / (levels[0]! + 0.05)).toBeGreaterThanOrEqual(4.5);
            }
          }
        }
      }
});

it("changes with the host's preset, accent and mode", () => {
  expect(decode({ preset: "calm", accent: "moss", mode: "dark" })).not.toBe(decode());
  expect(decode({ preset: "bold", accent: "sky", mode: "light" })).not.toBe(decode());
});
