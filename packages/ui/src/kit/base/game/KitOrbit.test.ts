import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, presets, size, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitDiceFace, KitWheel, KitOrbit, KitText } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function render(props: Parameters<typeof KitOrbit>[0], preset = "calm", mode = "light") {
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
          createElement(KitOrbit, props),
        ),
      ),
    ),
  );
}
const nodes = ["Ari", "Bo", "Cleo", "Dee"].map((label, i) => ({
  id: `r${i + 1}`,
  label,
  content: createElement(KitText, { part: "content", children: label.slice(0, 1) }),
}));
describe("KitOrbit", () => {
  it.each(presets)("draws caller nodes and current emphasis in $id", ({ id }) => {
    for (const mode of ["light", "dark"])
      for (const style of ["ring", "queue"] as const) {
        const html = render({ nodes, at: "r2", style, part: "order" }, id, mode);
        expect(elementAt(html, "home/c1/order")).toBeDefined();
        for (const node of nodes) {
          const item = elementAt(html, `home/c1/${node.id}/root`);
          expect(item.attributes).toContain(`aria-label="${node.label}"`);
          expect(styleAt(html, item)).toContain(`width:${size.avatar.lg + 16}px`);
          expect(elementAt(html, `home/c1/${node.id}/content`)).toBeDefined();
        }
        expect(elementAt(html, "home/c1/r2/root").attributes).toContain('aria-current="true"');
        expect(styleAt(html, "home/c1/r2/root")).toContain("var(--accent)");
      }
  });
  it("starts queues at current and reverses supplied order without mutating it", () => {
    const getOrder = (reverse: boolean) =>
      [
        ...render({ nodes, at: "r2", style: "queue", reverse }).matchAll(
          /data-testid="home\/c1\/(r\d)\/root"/g,
        ),
      ].map((m) => m[1]);
    expect(getOrder(false)).toEqual(["r2", "r3", "r4", "r1"]);
    expect(getOrder(true)).toEqual(["r2", "r1", "r4", "r3"]);
    expect(nodes.map((n) => n.id)).toEqual(["r1", "r2", "r3", "r4"]);
  });
  it.each(["ring", "queue"] as const)("preserves %s node frames and removes loading content", (style) => {
    const html = render({ nodes, at: "r2", loading: true, style });
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toMatch(/data-testid="home\/c1\/r\d+\//);
    expect(html).not.toContain("Cleo");
    expect(html).not.toContain('aria-current="true"');
    expect(render({ nodes: [], at: "", style })).toContain("Nothing here yet");
    expect(render({ nodes: [], at: "", style, loading: true })).not.toContain("Nothing here yet");
  });
});
