import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, presets, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitRangeBand } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

const input = { label: "Reading", min: 0, max: 100, low: 30, high: 70, value: 50 };
function render(props: Parameters<typeof KitRangeBand>[0], preset = "calm", mode = "light") {
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
          createElement(KitRangeBand, props),
        ),
      ),
    ),
  );
}
function drawing(html: string) {
  return elementAt(html, "home/c1/band").children[1]!.children[0]!;
}
describe("KitRangeBand", () => {
  it.each(presets)("draws normal bounds and marker in both tones in $id", ({ id }) => {
    for (const mode of ["light", "dark"])
      for (const tone of ["text", "warn"] as const) {
        const html = render({ ...input, tone, part: "band" }, id, mode);
        expect(html).toContain("Reading");
        expect(styleAt(html, drawing(html).children[0]!)).toContain("left:30%");
        expect(styleAt(html, drawing(html).children[0]!)).toContain("width:40%");
        expect(styleAt(html, drawing(html).children[1]!)).toContain("left:50%");
        expect(styleAt(html, drawing(html).children[1]!)).toContain(`var(--${tone})`);
        expect(html.match(/data-testid=/g)).toHaveLength(1);
        expect(html).not.toContain('role="button"');
      }
  });
  it.each([-100, 0, 100, 200])("clamps outlying reading %s within the track", (value) => {
    const html = render({ ...input, value, part: "band" });
    expect(styleAt(html, drawing(html).children[1]!)).toContain(`left:${value <= 0 ? 0 : 100}%`);
  });
  it("keeps equal, reversed and outlying bounds finite and visible", () => {
    for (const bounds of [
      { low: 50, high: 50 },
      { low: 200, high: -100 },
      { min: 50, max: 50 },
    ]) {
      const html = render({ ...input, ...bounds, part: "band" });
      expect(html).not.toMatch(/NaN|Infinity/);
      expect(styleAt(html, drawing(html).children[0]!)).toMatch(/min-width:(2|12)px/);
    }
  });
  it("keeps loading geometry and draws an empty track without a reading marker", () => {
    const filled = render({ ...input, part: "band" });
    const loading = render({ ...input, part: "band", loading: true });
    expect(styleAt(loading, drawing(loading))).toBe(styleAt(filled, drawing(filled)));
    expect(drawing(loading).children).toHaveLength(drawing(filled).children.length);
    expect(loading).toContain('aria-busy="true"');
    expect(render({ ...input, part: "band", value: NaN, label: "No reading yet" })).toContain(
      "No reading yet",
    );
  });
});
