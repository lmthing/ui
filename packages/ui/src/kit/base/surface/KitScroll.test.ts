import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, presets, themeName } from "@lmthing/ui/catalog";
import { KitCard, KitProvider, PartScope, KitScroll, KitText } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function render(props: Parameters<typeof KitScroll>[0], preset = "calm", mode = "light", inset = false) {
  const theme = { preset, mode, accent: "moss" } as Parameters<typeof KitProvider>[0]["theme"];
  const scroll = createElement(KitScroll, props);
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(
        KitProvider,
        { theme, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state: "filled", thing: "record", children: null },
          inset ? createElement(KitCard, { part: "frame", padded: true, children: scroll }) : scroll,
        ),
      ),
    ),
  );
}
const text: ReactNode = createElement(KitText, { part: "terms", children: "Caller supplied terms" });

describe("KitScroll", () => {
  it.each(presets)("draws filled, empty and loading states in $id", ({ id }) => {
    for (const mode of ["light", "dark"]) {
      for (const axis of ["vertical", "horizontal"] as const) {
        const html = render({ label: "Terms", children: text, axis }, id, mode);
        const root = elementAt(html, "home/c1/root");
        expect(root.children).toHaveLength(1);
        const scroll = root.children[0]!.children[0]!;
        expect(scroll.attributes).toContain('role="region"');
        expect(scroll.attributes).toContain('aria-label="Terms"');
        expect(scroll.attributes).toContain('tabindex="0"');
        expect(styleAt(html, scroll)).toContain(`max-height:${component.base.emptyMinHeight}px`);
        expect(html).toContain("Caller supplied terms");
        const empty = render({ label: "Terms", children: null, axis }, id, mode);
        expect(empty).toContain("No records yet");
        expect(empty).toContain("<svg");
        expect(elementAt(empty, "home/c1/root").children).toHaveLength(1);
        const loading = render({ label: "Terms", children: text, axis, loading: true }, id, mode);
        expect(loading).toContain('aria-busy="true"');
        expect(loading).not.toContain("Caller supplied terms");
        expect(loading).not.toContain('data-testid="home/c1/terms"');
        expect(elementAt(loading, "home/c1/root").children).toHaveLength(1);
      }
    }
  });
  it("honours the part and unbounded option", () => {
    const html = render({ label: "Terms", children: text, part: "terms_area", bounded: false });
    const root = elementAt(html, "home/c1/terms_area");
    expect(styleAt(html, root.children[0]!.children[0]!)).not.toContain("max-height");
    expect(html.match(/data-testid="home\/c1\/terms_area"/g)).toHaveLength(1);
  });
  it("lets a padded card own the surface and gutter of nested prose", () => {
    const html = render({ label: "Terms", children: text }, "calm", "light", true);
    const root = elementAt(html, "home/c1/root");
    expect(styleAt(html, root)).not.toMatch(/box-shadow:|background-color:/);
    const scroll = root.children[0]!.children[0]!;
    expect(scroll.attributes).toContain('aria-label="Terms"');
    expect(scroll.attributes).toContain('tabindex="0"');
    const content = scroll.children[0]!.children[0]!;
    expect(styleAt(html, content)).toContain("padding-left:0px");
    expect(elementAt(html, "home/c1/terms").attributes).toContain('data-testid="home/c1/terms"');
    expect(html).toContain(">Caller supplied terms<");
  });
});
