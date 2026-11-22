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

describe("KitWheel positioning", () => {
  it("aligns every settled selection with the pointer despite stale caller rotation", () => {
    for (const option of options)
      for (const rotation of [0, 0.25, 19.7]) {
        const html = render({ options, at: option.id, rotation });
        const wheel = elementAt(html, "home/c1/root").children[0]!;
        const slot = wheel.children.find((child) =>
          child.children[0]?.attributes.includes(`data-testid="home/c1/${option.id}/root"`),
        )!;
        const style = styleAt(html, slot);
        const left = Number(style.match(/left:([-\d.]+)px/)![1]);
        const box = component.base.ringLg + size.avatar.lg;
        expect(left + size.avatar.lg / 2).toBeCloseTo(box / 2);
      }
    const busy = render({ options, at: "r2", rotation: 0.25, busy: true });
    expect(busy).not.toContain('aria-current="true"');
    const empty = render({ options: [], rotation: 0 });
    expect(empty).not.toContain('width="232"');
  });
  it("centres the idle wheel on a sector without marking an outcome or snapping a busy turn", () => {
    const html = render({ options, rotation: 0 });
    const wheel = elementAt(html, "home/c1/root").children[0]!;
    const third = wheel.children.find((node) =>
      node.children[0]?.attributes.includes('data-testid="home/c1/r4/root"'),
    )!;
    const left = Number(styleAt(html, third).match(/left:([-\d.]+)px/)?.[1]);
    expect(left + size.avatar.lg / 2).toBeCloseTo((component.base.ringLg + size.avatar.lg) / 2);
    expect(html).not.toContain('aria-current="true"');
    expect(render({ options, rotation: 0, busy: true })).not.toContain(styleAt(html, third));
  });
  it("softens both clipped strip edges without adding targets", () => {
    const html = render({ options, rotation: 0, style: "strip" });
    expect(html).toContain("linear-gradient(to left, transparent, var(--surface))");
    expect(html).toContain("linear-gradient(to right, transparent, var(--surface))");
    expect(html).not.toContain('role="button"');
  });
});
