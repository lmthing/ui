import { describe, expect, it } from "vitest";
import { artStyles, themeName, type ThemeChoice } from "../themes";
import { buildImagePrompt, imageFraming, imageKinds, imageRejectIf, type ImageKind } from ".";

const theme = { preset: "calm", accent: "moss", mode: "light" } as const;

describe("image prompts", () => {
  it.each(imageKinds)("builds %s from its Markdown and includes the four guards", (kind) => {
    const prompt = buildImagePrompt({ kind, subject: "unmarked earthenware bowl" }, theme);
    expect(prompt).toContain("Subject: unmarked earthenware bowl.");
    expect(prompt).toMatch(/No text.*logos.*\n?.*No real people.*No hands/);
    expect(prompt).toContain(imageFraming[kind] === "wide" ? "Wide landscape crop" : "Square");
    expect(imageRejectIf(kind)).toHaveLength(3);
  });

  it("snapshots every kind and all eight style treatments", () => {
    const combinations = imageKinds.map((kind, at) => {
      const t: ThemeChoice = {
        preset: "editorial",
        accent: "teal",
        mode: at % 2 ? "light" : "dark",
        density: at % 2 ? "comfortable" : "compact",
        artStyle: artStyles[at % artStyles.length]!,
      };
      return [kind, buildImagePrompt({ kind, subject: "ferns on a greenhouse bench" }, t)];
    });
    expect(Object.fromEntries(combinations)).toMatchSnapshot();
  });

  it("keeps avatar illustration ahead of photographic styles", () => {
    const slot = { kind: "avatar", subject: "fictional walker with pigtails" } as const;
    for (const artStyle of ["natural_photo", "studio_photo"] as const) {
      const prompt = buildImagePrompt(slot, { ...theme, artStyle });
      expect(prompt).toMatch(/clearly illustrated/);
      expect(prompt).toMatch(/drawn editorial portrait in place of photography/);
      expect(prompt).not.toMatch(/Observational photography|Studio product photography/);
    }
  });

  it("uses the backward-compatible default and ignores UI motion", () => {
    const slot = { kind: "hero", subject: "a watering can" } as const;
    expect(buildImagePrompt(slot, theme)).toBe(
      buildImagePrompt(slot, {
        ...theme,
        artStyle: "natural_photo",
        density: "comfortable",
        motion: "lively",
      }),
    );
    expect(themeName(theme)).toBe(themeName({ ...theme, artStyle: "watercolor" }));
  });

  it("does not frame a repeat as a centered subject", () => {
    const prompt = buildImagePrompt({ kind: "pattern", subject: "stacked weight plates" }, theme);
    expect(prompt).toContain("match opposite edges exactly");
    expect(prompt).not.toContain("away from the outside edges");
  });

  it("rejects an invalid slot even if untyped callers pass one", () => {
    expect(() => buildImagePrompt({ kind: "table" as ImageKind, subject: "ferns" }, theme)).toThrow();
  });
});
