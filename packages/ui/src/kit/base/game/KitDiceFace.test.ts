import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, presets, size, space, type as typography, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitDiceFace } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function render(props: Parameters<typeof KitDiceFace>[0], preset = "calm", mode = "light") {
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
          createElement(KitDiceFace, props),
        ),
      ),
    ),
  );
}
const die = {
  item: "r1",
  sides: 6,
  held: false,
  label: "First face",
  holdPart: "hold",
  part: "face",
} as const;
describe("KitDiceFace", () => {
  it.each(presets)("draws pip counts and held outlines in $id", ({ id }) => {
    for (const mode of ["light", "dark"])
      for (let value = 1; value <= 6; value++) {
        const html = render({ ...die, value, held: true }, id, mode);
        const face = elementAt(html, "home/c1/r1/face");
        const hold = elementAt(html, "home/c1/r1/hold");
        expect(face.children).toEqual([hold]);
        expect(hold.attributes).toContain('role="button"');
        expect(hold.attributes).toContain('aria-pressed="true"');
        expect(styleAt(html, hold)).toContain(`width:${size.control.md * 2}px`);
        expect(styleAt(html, hold)).toContain("var(--accent)");
        const pips = hold.children[0]!;
        expect(styleAt(html, pips)).toContain(`top:${space.sm}px`);
        const dots = pips.children.flatMap((row) => row.children);
        expect(dots.filter((dot) => styleAt(html, dot).includes("opacity:1"))).toHaveLength(value);
      }
  });
  it.each([4, 6, 8, 10, 12, 20] as const)("draws caller-owned numbered %s-sided faces", (sides) => {
    const html = render({ ...die, sides, style: "numbers", value: sides, disabled: true });
    const hold = elementAt(html, "home/c1/r1/hold");
    expect(hold.attributes).toContain('aria-disabled="true"');
    expect(styleAt(html, hold)).toContain(`opacity:${component.base.disabledOpacity}`);
    expect(styleAt(html, hold.children[0]!)).toContain(`font-size:${typography.heading.size}px`);
    expect(html).toContain(`>${sides}</span>`);
    expect(render({ ...die, sides, style: "numbers" })).not.toContain('role="text"');
    expect(render({ ...die, sides, style: "numbers", value: sides + 1 })).not.toContain('role="text"');
  });
  it("keeps geometry, hides outcomes and removes loading targets", () => {
    for (const style of ["pips", "numbers"] as const) {
      const html = render({ ...die, style, value: 5, held: true, loading: true });
      expect(html).toContain('aria-busy="true"');
      expect(html).not.toContain("data-testid=");
      expect(html).not.toContain('role="button"');
      expect(html).not.toContain("First face");
      expect(html).not.toContain(">5<");
    }
    const html = render({ item: "r2", sides: 6, value: 3, held: false, label: "Static face" });
    expect(elementAt(html, "home/c1/r2/root").attributes).not.toContain('role="button"');
  });
  it.each(presets)("uses one value-independent loading bar and a softer edge in $id", ({ id }) => {
    for (const mode of ["light", "dark"]) {
      const loading = render({ ...die, loading: true }, id, mode);
      expect(loading).toEqual(render({ ...die, value: 1, loading: true }, id, mode));
      expect(loading).toEqual(
        render({ ...die, sides: 20, value: 20, style: "numbers", loading: true }, id, mode),
      );
      expect(loading).toContain("border-top-color:var(--line)");
      expect(loading).toContain(`width:${size.control.md * 2}px`);
      expect(loading).toContain(`width:${size.icon.lg + space.md}px`);
      expect(loading).toContain(`height:${space.sm}px`);
      expect(loading).not.toEqual(render(die, id, mode));
    }
  });
});

it("marks both dice hold controls and distinguishes the held value without relying on color", () => {
  const unheld = render({ ...die, value: 6 });
  const held = render({ ...die, value: 6, held: true });
  expect(styleAt(unheld, "home/c1/r1/hold")).toContain("var(--raised)");
  expect(elementAt(unheld, "home/c1/r1/hold").attributes).toContain('aria-pressed="false"');
  const iconOf = (html: string) => html.match(/<svg\b.*?<\/svg>/)?.[0];
  expect(iconOf(unheld)).toBeDefined();
  expect(iconOf(held)).toBeDefined();
  expect(iconOf(held)).not.toEqual(iconOf(unheld));
  expect(iconOf(render({ ...die, value: 6, loading: true }))).toBeUndefined();
});
