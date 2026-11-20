import { describe, expect, it } from "vitest";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { components, component, radius, space, type as typography } from "@lmthing/ui/catalog";
import { KitCard, KitProvider, KitSkeleton, PartScope } from "@lmthing/ui/kit";
import { renderInstance, elementAt, styleAt, config } from "../../../../test/render";
import { linesOf, skeletonInset } from "./skeleton-content";

const theme = { preset: "calm", accent: "moss", mode: "light" } as const;
const ids = [
  "Choice",
  "Player",
  "Timeline",
  "Bars",
  "Amount",
  "Card",
  "List",
  "Photo",
  "Checklist",
  "MapPins",
  "Sparkline",
  "KeyValue",
  "Stats",
  "Hero",
  "Profile",
  "Ring",
  "Gallery",
] as const;

function descendants(node: ReturnType<typeof elementAt>): ReturnType<typeof elementAt>[] {
  return [node, ...node.children.flatMap(descendants)];
}
function styles(html: string) {
  return descendants(elementAt(html, "home/c1/root"))
    .map((node) => styleAt(html, node))
    .join("\n");
}

function loadingText(
  text: string,
  finish: Pick<ComponentProps<typeof KitSkeleton>, "density" | "emphasis"> = {},
) {
  const html = renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: "kit_calm_light_moss" },
      createElement(KitProvider, {
        theme: { ...theme, ...(finish.density ? { density: "compact" as const } : {}) },
        children: createElement(PartScope, {
          screen: "home",
          component: "c1",
          state: "loading",
          rev: 1,
          children: createElement(KitCard, {
            children: createElement(KitSkeleton, {
              shape: "figure",
              lines: [{ text, role: "body" }],
              ...finish,
            }),
          }),
        }),
      }),
    ),
  );
  return styles(html);
}

describe("skeleton content geometry", () => {
  it.each(["5", "600 min", "12:30", "1,240.50"])("keeps numeric %s on one hidden line", (text) => {
    expect(loadingText(text)).toContain("text-overflow:ellipsis");
  });
  it("retains wrapping for ordinary body text", () => {
    expect(loadingText("Caller content that wraps")).not.toContain("text-overflow:ellipsis");
  });
  it("uses the emphasized line geometry even when overriding the app density", () => {
    const css = loadingText("Entry", { density: "comfortable", emphasis: "hero" });
    expect(css).toContain(`line-height:${typography.heading.lineHeight}px`);
    expect(css).toContain(`font-size:${typography.heading.size}px`);
  });
  it("uses only present text and preserves explicit roles", () => {
    expect(linesOf({ title: "Title", sub: "Detail", meta: "Context" }, true)).toEqual([
      { text: "Title", role: "heading" },
      { text: "Detail", role: "body" },
      { text: "Context", role: "caption" },
    ]);
    expect(linesOf({})).toEqual([]);
    const lines = [{ text: "Value", role: "number" as const }];
    expect(linesOf({ lines })).toBe(lines);
  });
  it("matches row and padded-card insets without a second inset", () => {
    expect(skeletonInset("none")).toBe(component.base.none);
    expect(skeletonInset("md")).toBe(space.md);
    expect(skeletonInset("card") + space.xs).toBe(space.md);
  });
});
describe("skeleton loading through the real entry", () => {
  it("retains compact box leads for existing control skeletons", () => {
    const html = renderInstance("Checklist", components.Checklist.examples[0], "loading", theme);
    expect(styles(html)).toContain("height:24px");
    expect(styles(html)).not.toMatch(/(?:^|;)height:44px(?:;|$)/m);
  });
  it.each(ids)("renders every %s example loading through the real entry", (id) => {
    for (const input of components[id].examples) {
      const html = renderInstance(id, input, "loading", theme, { resolvePhoto: () => "photo-uri" });
      expect(html).toContain('aria-busy="true"');
      expect(html).not.toMatch(/role="(?:button|radio|slider|link)"/);
    }
  });
  it.each(["audio", "video", "compact"] as const)("keeps the %s artwork and control geometry", (mode) => {
    const appearance = mode === "compact" ? { density: "compact", detail: "brief" } : { style: mode };
    const html = renderInstance(
      "Player",
      { ...components.Player.examples[0], ...appearance },
      "loading",
      theme,
    );
    const css = styles(html);
    if (mode === "audio") expect(css).toMatch(/aspect-ratio:\s*1(?:;|\n|$)/);
    if (mode === "video") expect(css).toMatch(/aspect-ratio:\s*1\.777/);
    if (mode === "compact") expect(css).not.toContain("aspect-ratio:");
    expect(css.match(/height:44px/g)?.length).toBeGreaterThanOrEqual(4);
    expect(css).toContain(`border-top-left-radius:${radius.pill}px`);
    const root = elementAt(html, "home/c1/root");
    expect(styleAt(html, root.children[0]!)).toContain("padding-left:0px");
  });
  it("keeps a time gutter rather than an icon lead", () => {
    const html = renderInstance("Timeline", components.Timeline.examples[0], "loading", theme);
    expect(styles(html)).toContain(`width:${component.base.timeWidth}px`);
  });
  it("keeps chart height, total and one column per point", () => {
    const input = components.Bars.examples[1]!;
    const html = renderInstance("Bars", input, "loading", theme);
    expect(styles(html).match(/height:142px/g)).toHaveLength(input.points.length);
    expect(styles(html)).toContain("height:44px");
    expect(styles(html)).toContain("height:24px");
  });
  it("centres all four figure lines", () => {
    const html = renderInstance("Amount", components.Amount.examples[0], "loading", theme);
    const nodes = descendants(elementAt(html, "home/c1/root"));
    const textNodes = nodes.filter((node) => node.tag === "span");
    expect(textNodes).toHaveLength(4);
    for (const node of textNodes) expect(styleAt(html, node)).toContain("text-align:center");
  });
  it("keeps resolved media at the filled card inset", () => {
    const html = renderInstance("Card", components.Card.examples[0], "loading", theme, {
      resolvePhoto: () => "photo-uri",
    });
    const root = elementAt(html, "home/c1/root");
    expect(styleAt(html, root)).toContain(`padding-left:${space.xs}px`);
    expect(styleAt(html, root.children[0]!)).toContain(`padding-left:${space.md - space.xs}px`);
  });
});

describe("choice loading after filled-layout polish", () => {
  it("keeps the un-inset root, caption details and reserved icon gutter", () => {
    const input = components.Choice.examples[0]!;
    const html = renderInstance("Choice", input, "loading", theme);
    const root = elementAt(html, "home/c1/root");
    expect(styleAt(html, root)).toContain("padding-left:0px");
    expect(styles(html)).toContain("line-height:18px");
    const columns = descendants(root).filter((node) => {
      const css = styleAt(html, node);
      return css.includes("width:24px") && css.includes("height:22px");
    });
    expect(columns).toHaveLength(input.options.length);
  });
});
