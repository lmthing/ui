import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getThemes, TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, presets, swatchNames, themeName } from "@lmthing/ui/catalog";
import { KitCard, KitJar, KitProvider, KitText, PartScope } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function render(child: React.ReactNode, preset = "calm", mode = "light") {
  const theme = { preset, mode, accent: "moss" } as Parameters<typeof KitProvider>[0]["theme"];
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(
        KitProvider,
        { theme, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
          child,
        ),
      ),
    ),
  );
}
const value = createElement(KitText, { part: "value", role: "number", children: "12" });
describe("KitJar", () => {
  it.each(presets)("draws empty, partial and full normalized jars in $id", ({ id }) => {
    for (const mode of ["light", "dark"])
      for (const [ratio, percent] of [
        [-1, 0],
        [0, 0],
        [0.5, 50],
        [1, 100],
        [2, 100],
        [NaN, 0],
      ]) {
        const html = render(
          createElement(KitJar, { ratio: ratio!, label: "Progress", children: value }),
          id,
          mode,
        );
        const root = elementAt(html, "home/c1/root");
        expect(styleAt(html, root)).toContain(`width:${component.base.ringMd}px`);
        const body = root.children[1]!;
        expect(styleAt(html, body)).toContain(`height:${component.base.ringLg - 8}px`);
        expect(styleAt(html, body.children[0]!)).toContain(`height:${percent}%`);
        expect(html).toContain('data-testid="home/c1/value"');
      }
  });
  it("keeps loading fill and content geometry and supports no value", () => {
    const filled = render(createElement(KitJar, { ratio: 0.5, label: "Progress", children: value }));
    const loading = render(
      createElement(KitJar, { ratio: 0.5, label: "Progress", children: value, loading: true }),
    );
    const body = elementAt(loading, "home/c1/root").children[1]!;
    expect(styleAt(loading, body.children[0]!)).toContain("height:50%");
    const geometry = (css: string) => css.replace(/border-(?:top|right|bottom|left)-color:[^;]+;/g, "");
    expect(geometry(styleAt(filled, elementAt(filled, "home/c1/root").children[1]!))).toBe(
      geometry(styleAt(loading, body)),
    );
    expect(loading).toContain('inert=""');
    expect(render(createElement(KitJar, { ratio: 0, label: "Progress", part: "jar" }))).toContain(
      'data-testid="home/c1/jar"',
    );
  });
});
function luminance(hex: string) {
  const channels = [1, 3, 5].map((at) => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
describe("KitCard swatch foreground context", () => {
  it.each(swatchNames)(
    "gives %s a readable scoped text and muted foreground in all presets and modes",
    (swatch) => {
      for (const { id } of presets)
        for (const mode of ["light", "dark"]) {
          const html = render(createElement(KitCard, { swatch, padded: true, children: value }), id, mode);
          expect(styleAt(html, "home/c1/root")).toContain(component.swatch[swatch]);
          const theme = getThemes()[`kit_${id}_${mode}_moss_swatch_${swatch}`]!;
          for (const role of ["text", "muted", "accent", "good", "warn", "bad"]) {
            const levels = [luminance(component.swatch[swatch]), luminance(theme[role]!.val as string)].sort(
              (a, b) => b - a,
            );
            expect((levels[0]! + 0.05) / (levels[1]! + 0.05)).toBeGreaterThanOrEqual(4.5);
          }
        }
    },
  );
});
