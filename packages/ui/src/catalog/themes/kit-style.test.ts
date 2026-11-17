import { describe, expect, it } from "vitest";
import { accents, kitStyleOf, presets, themeName } from "./index";

describe("kit styles and theme names", () => {
  it("derives shapes, density and font pairing from metadata", () => {
    expect(kitStyleOf(presets[0])).toMatchObject({
      radiusShift: 0,
      density: { rowPad: "md" },
      fonts: { text: "humanist" },
      surface: "soft",
    });
    expect(kitStyleOf(presets[1])).toMatchObject({ radiusShift: -1, density: { rowPad: "sm" } });
    expect(kitStyleOf(presets[2])).toMatchObject({
      radiusShift: -1,
      fonts: { text: "serif", heading: "serifHeading" },
      surface: "hairline",
    });
  });
  it("names every preset, mode and accent combination uniquely", () => {
    const names = presets.flatMap((preset) =>
      ["light", "dark"].flatMap((mode) =>
        accents.map((accent) =>
          themeName({ preset: preset.id, mode: mode as "light" | "dark", accent: accent.id }),
        ),
      ),
    );
    expect(new Set(names).size).toBe(12);
    expect(names).toContain("kit_editorial_dark_sky");
  });
});
