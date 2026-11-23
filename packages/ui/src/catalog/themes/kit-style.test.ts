import { describe, expect, it } from "vitest";
import {
  accents,
  bold,
  calm,
  editorial,
  kitStyleOf,
  paper,
  playful,
  presets,
  soft,
  sport,
  themeName,
} from "./index";

describe("kit styles and theme names", () => {
  it("derives shapes, density and font pairing from metadata", () => {
    expect(kitStyleOf(calm)).toMatchObject({
      radiusShift: 0,
      density: { rowPad: "md" },
      fonts: { text: "humanist" },
      surface: "flat",
    });
    expect(kitStyleOf(bold)).toMatchObject({ radiusShift: -1, density: { rowPad: "sm" } });
    expect(kitStyleOf(editorial)).toMatchObject({
      radiusShift: -1,
      fonts: { text: "serif", heading: "serifHeading" },
      surface: "editorial",
    });
  });
  it("uses rounded type and full corners for Playful and Soft", () => {
    for (const preset of [playful, soft])
      expect(kitStyleOf(preset)).toMatchObject({
        radiusShift: 1,
        fonts: { text: "rounded", heading: "rounded", number: "rounded" },
      });
  });
  it("uses condensed numbers but keeps Sport's other roles in grotesk", () => {
    expect(kitStyleOf(sport)).toMatchObject({
      radiusShift: -1,
      fonts: { text: "grotesk", heading: "grotesk", number: "condensed" },
    });
  });
  it("uses the text serif for Paper headings but the display serif for Editorial", () => {
    expect(kitStyleOf(paper).fonts).toEqual({ text: "serif", heading: "serif", number: "serif" });
    expect(kitStyleOf(editorial).fonts.heading).toBe("serifHeading");
  });
});

describe("theme choices", () => {
  it("gives every preset its own surface recipe without tying the recipe to the id", () => {
    expect(new Set(presets.map((preset) => kitStyleOf(preset).surface)).size).toBe(12);
    for (const preset of presets) {
      expect(kitStyleOf({ ...preset, id: "renamed" })).toEqual(kitStyleOf(preset));
    }
  });

  it("names every preset, mode and accent combination uniquely", () => {
    expect(presets.map(({ id }) => id)).toEqual([
      "calm",
      "minimal",
      "warm",
      "fresh",
      "bold",
      "playful",
      "soft",
      "editorial",
      "paper",
      "sport",
      "night",
      "mono",
    ]);
    expect(accents.map(({ id }) => id)).toEqual([
      "moss",
      "forest",
      "teal",
      "sky",
      "indigo",
      "violet",
      "rose",
      "coral",
      "amber",
      "sand",
      "slate",
      "ink",
    ]);
    const names = presets.flatMap((preset) =>
      (["light", "dark"] as const).flatMap((mode) =>
        accents.map((accent) => themeName({ preset: preset.id, mode, accent: accent.id })),
      ),
    );
    expect(new Set(names).size).toBe(288);
    expect(names).toContain("kit_editorial_dark_sky");
  });
});
