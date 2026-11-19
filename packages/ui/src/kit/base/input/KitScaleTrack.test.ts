import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { presets, size, space, themeName, type ThemeChoice } from "@lmthing/ui/catalog";
import { KitProvider, KitScaleTrack, PartScope } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

const labels = ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"] as const;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function render(props: Parameters<typeof KitScaleTrack>[0], choice: ThemeChoice = theme) {
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(choice) },
      createElement(
        KitProvider,
        { theme: choice, interactive: true, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
          createElement("div", { "data-testid": "base" }, createElement(KitScaleTrack, props)),
        ),
      ),
    ),
  ).replace(/<style[\s\S]*?<\/style>/g, "");
}

describe("compact readonly stars", () => {
  it.each(presets)("keeps the rating accessible and small in $id", ({ id: preset }) => {
    for (const mode of ["light", "dark"] as const) {
      for (const value of [0, 2.5, 5]) {
        const html = render(
          { style: "stars", value, labels, readonly: true, compact: true },
          {
            preset,
            mode,
            accent: "moss",
          },
        );
        const track = elementAt(html, "base").children[0]!;
        expect(track.attributes).toContain('role="img"');
        expect(track.attributes).toContain(`aria-label="${value} stars"`);
        expect(styleAt(html, track)).toContain(`gap:${space.xs}px`);
        expect(styleAt(html, track)).toContain("align-self:flex-start");
        expect(track.children).toHaveLength(5);
        expect(html).not.toContain('role="radio"');
        expect(html).not.toContain('data-testid="home/c1/l');
        for (const [index, star] of track.children.entries()) {
          expect(star.attributes).toContain('aria-hidden="true"');
          expect(styleAt(html, star)).toContain(`width:${size.icon.sm}px`);
          expect(styleAt(html, star)).toContain(`height:${size.icon.sm}px`);
          const fill = Math.min(1, Math.max(0, value - index));
          expect(star.children).toHaveLength(fill > 0 ? 2 : 1);
          if (fill > 0) expect(styleAt(html, star.children[1]!)).toContain(`width:${fill * 100}%`);
        }
      }
    }
  });
  it.each(["mood", "stars", "dots"] as const)("preserves editable %s targets", (style) => {
    const props = { style, value: 3, labels };
    const html = render({ ...props, compact: true });
    expect(html).toBe(render(props));
    for (let index = 1; index <= 5; index++) {
      const target = elementAt(html, `home/c1/l${index}`);
      expect(target.attributes).toContain('role="radio"');
      expect(target.attributes).toContain(`aria-checked="${index === 3}"`);
      expect(styleAt(html, target)).toContain(`min-width:${size.control.md}px`);
      expect(styleAt(html, target)).toContain(`height:${size.control.md}px`);
    }
  });
  it.each(["mood", "stars", "dots"] as const)("keeps default readonly %s geometry", (style) => {
    const props = { style, value: 3, labels, readonly: true };
    const html = render(props);
    expect(html).toBe(render({ ...props, compact: false }));
    if (style !== "stars") expect(html).toBe(render({ ...props, compact: true }));
    for (const cell of elementAt(html, "base").children[0]!.children)
      expect(styleAt(html, cell)).toContain(`min-width:${size.control.md}px`);
  });
});
