import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, presets, space, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitRadialTrack, KitText, KitAction } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

const rings = [
  { id: "a", ratio: 0, tone: "accent" },
  { id: "b", ratio: 0.5, tone: "good" },
  { id: "c", ratio: 1, tone: "warn" },
] as const;
const segments = Array.from({ length: 28 }, (_, i) => ({
  id: `day${i}`,
  tone: i < 14 ? ("accent" as const) : ("muted" as const),
  current: i === 6,
}));
function render(props: Parameters<typeof KitRadialTrack>[0], preset = "calm", mode = "light") {
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
          createElement(KitRadialTrack, props),
        ),
      ),
    ),
  );
}
describe("KitRadialTrack", () => {
  it.each(presets)("draws rings and days with only caller-owned content addressed in $id", ({ id }) => {
    for (const mode of ["light", "dark"])
      for (const props of [
        { style: "rings" as const, rings },
        { style: "days" as const, segments },
      ]) {
        const html = render(
          { ...props, part: "track", children: createElement(KitText, { part: "value", children: "Value" }) },
          id,
          mode,
        );
        expect(styleAt(html, "home/c1/track")).toContain(`height:${component.base.ringLg + space.xl * 2}px`);
        expect(styleAt(html, "home/c1/track")).toContain("align-items:center");
        expect(elementAt(html, "home/c1/track").children[0]!.attributes).toContain('aria-hidden="true"');
        expect(html).toContain('data-testid="home/c1/value"');
        expect(html.match(/data-testid=/g)).toHaveLength(2);
        expect(html).not.toContain('role="button"');
        expect(html).not.toMatch(/NaN|Infinity/);
      }
  });
  it("draws zero, partial and full rings at distinct concentric radii", () => {
    const html = render({ style: "rings", rings });
    const circles = [...html.matchAll(/<circle\b[^>]*>/g)].map((m) => m[0]);
    expect(circles).toHaveLength(5);
    expect(new Set(circles.map((node) => node.match(/ r="([^"]+)"/)![1]))).toHaveLength(3);
    expect(circles.filter((node) => node.includes("stroke-dasharray"))).toHaveLength(2);
    expect(circles.at(-1)).toContain('stroke-linecap="butt"');
    for (const ratio of [-1, 2, NaN]) {
      expect(render({ style: "rings", rings: [{ id: "a", ratio, tone: "accent" }] })).not.toMatch(
        /NaN|Infinity/,
      );
    }
  });
  it("draws every day segment, including a single segment and the current marker", () => {
    for (const count of [1, 7, 28]) {
      const html = render({ style: "days", segments: segments.slice(0, count) });
      expect(html.match(/<path /g)).toHaveLength(count);
      expect(html.match(/<circle /g) ?? []).toHaveLength(count > 6 ? 1 : 0);
    }
  });
});
describe("KitRadialTrack states", () => {
  it("keeps filled drawings while loading, removes centre controls, and reserves empty geometry", () => {
    for (const props of [
      { style: "rings" as const, rings },
      { style: "days" as const, segments },
    ]) {
      const filled = render(props),
        loading = render({
          ...props,
          loading: true,
          children: createElement(KitAction, { part: "action", label: "Action" }),
        });
      expect(styleAt(loading, "home/c1/root")).toBe(styleAt(filled, "home/c1/root"));
      expect(loading.match(/<circle /g)).toHaveLength(filled.match(/<circle /g)!.length);
      expect(loading.match(/<path /g) ?? []).toHaveLength((filled.match(/<path /g) ?? []).length);
      expect(loading).toContain('aria-busy="true"');
      expect(loading).not.toContain('role="button"');
      expect(loading).not.toContain('data-testid="home/c1/action"');
    }
    for (const props of [
      { style: "rings" as const, rings: [] },
      { style: "days" as const, segments: [] },
    ]) {
      expect(render(props).match(/<circle /g)).toHaveLength(1);
      expect(styleAt(render(props), "home/c1/root")).toContain(
        `width:${component.base.ringLg + space.xl * 2}px`,
      );
    }
  });
});
