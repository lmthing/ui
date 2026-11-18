import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, presets, size, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitDiceFace, KitWheel, KitOrbit, KitText } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function render(props: Parameters<typeof KitWheel>[0], preset = "calm", mode = "light") {
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
          createElement(KitWheel, props),
        ),
      ),
    ),
  );
}
const options = [
  { id: "r1", label: "North" },
  { id: "r2", label: "East", disabled: true },
  { id: "r3", label: "South" },
  { id: "r4", label: "West" },
];
describe("KitWheel", () => {
  it.each(presets)("draws supplied options and current/used states in $id", ({ id }) => {
    for (const mode of ["light", "dark"])
      for (const style of ["wheel", "strip"] as const) {
        const html = render({ options, rotation: 0.25, at: "r3", part: "choices", style }, id, mode);
        expect(elementAt(html, "home/c1/choices")).toBeDefined();
        for (const option of options) {
          const node = elementAt(html, `home/c1/${option.id}/root`);
          expect(node.attributes).toContain(`aria-label="${option.label}"`);
          expect(node.attributes).not.toContain('role="button"');
        }
        expect(elementAt(html, "home/c1/r3/root").attributes).toContain('aria-current="true"');
        expect(styleAt(html, elementAt(html, "home/c1/r2/root").children[0]!)).toContain("line-through");
      }
  });
  it.each(["wheel", "strip"] as const)("handles empty, busy, exhausted and loading %s drawings", (style) => {
    expect(render({ options: [], rotation: 0, style })).toContain("Nothing here yet");
    const exhausted = render({
      options: options.map((o) => ({ ...o, disabled: true })),
      rotation: -0.5,
      style,
    });
    expect(exhausted).not.toContain('role="button"');
    expect(render({ options, rotation: 0, busy: true, style })).toContain('aria-busy="true"');
    const loading = render({ options, rotation: 2.5, loading: true, style });
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toMatch(/data-testid="home\/c1\/r\d+\//);
    expect(loading).not.toContain("North");
    expect(loading).not.toContain('aria-current="true"');
    const placeholders = render({ options: [], rotation: Number.NaN, loading: true, style });
    expect(placeholders).not.toContain("Nothing here yet");
    expect(placeholders).not.toContain("NaN");
  });
});
