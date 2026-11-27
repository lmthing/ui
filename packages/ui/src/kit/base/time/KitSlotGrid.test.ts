import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, presets, size, space, themeName, type as typography } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, KitSlotGrid } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

const times = [
  { id: "r1", label: "09:00", taken: false },
  { id: "r2", label: "09:30", sub: "10:00", taken: false },
  { id: "r3", label: "10:00", taken: true },
] as const;
function render(props: Parameters<typeof KitSlotGrid>[0], preset = "calm", mode = "light") {
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
          { screen: "home", component: "c1", rev: 1, state: "filled", thing: "record", children: null },
          createElement(KitSlotGrid, props),
        ),
      ),
    ),
  );
}

describe("KitSlotGrid", () => {
  it.each(presets)("draws readable, addressed slots in $id", ({ id }) => {
    for (const mode of ["light", "dark"]) {
      for (const style of ["grid", "list"] as const) {
        const html = render({ times, at: "r2", style }, id, mode);
        const root = elementAt(html, "home/c1/root");
        expect(root.children).toHaveLength(times.length);
        expect(styleAt(html, root)).toContain(style === "grid" ? "flex-wrap:wrap" : "flex-direction:column");
        for (const slot of times) {
          const node = elementAt(html, `home/c1/${slot.id}/root`);
          expect(node.attributes).toContain('role="button"');
          expect(node.attributes).toContain(`aria-pressed="${slot.id === "r2"}"`);
          expect(node.attributes).toContain(`aria-disabled="${slot.taken}"`);
          expect(styleAt(html, node)).toContain(`min-height:${size.control.md}px`);
          expect(styleAt(html, node)).toContain(`min-width:${size.control.md}px`);
          expect(html).toContain(slot.label);
          const time = elementAt(html, `home/c1/${slot.id}/time`);
          expect(styleAt(html, time)).toContain(`font-size:${typography.body.size}px`);
          expect(time).toEqual(node.children[0]!.children[0]);
          expect(time.attributes).not.toContain('role="button"');
          expect(html.match(new RegExp(`data-testid="home/c1/${slot.id}/time"`, "g"))).toHaveLength(1);
        }
        expect(styleAt(html, "home/c1/r2/root")).toContain("var(--accent)");
        expect(styleAt(html, "home/c1/r1/root")).toContain("var(--line)");
        expect(styleAt(html, "home/c1/r1/root")).not.toContain("var(--muted)");
        expect(styleAt(html, "home/c1/r2/root")).toContain(
          `border-top-width:${component.base.strongBorder}px`,
        );
        expect(elementAt(html, "home/c1/r2/root").attributes).toContain('aria-label="09:30, 10:00"');
        const end = elementAt(html, "home/c1/r2/root").children[1]!.children[0]!;
        expect(styleAt(html, end)).toContain(`font-size:${typography.caption.size}px`);
      }
    }
  });
});
describe("KitSlotGrid states", () => {
  it.each(["grid", "list"] as const)("keeps %s geometry while removing loading targets", (style) => {
    const filled = render({ times, style });
    const loading = render({ times, style, loading: true });
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toContain('role="button"');
    expect(loading).not.toContain('data-testid="home/c1/r1/root"');
    expect(loading).not.toMatch(/data-testid="home\/c1\/r\d+\/time"/);
    const filledRows = elementAt(filled, "home/c1/root").children;
    const loadingRows = elementAt(loading, "home/c1/root").children;
    expect(loadingRows).toHaveLength(filledRows.length);
    loadingRows.forEach((row, i) => {
      expect(row.attributes).toContain('aria-hidden="true"');
      expect(row.children).toHaveLength(filledRows[i]!.children.length);
      expect(styleAt(loading, row)).toContain("background-color:transparent");
      row.children.forEach((line, index) => {
        const bar = line.children[1]!;
        expect(styleAt(loading, bar)).toContain(`height:${index === 0 ? space.sm : space.xs}px`);
        expect(styleAt(loading, bar)).toContain("background-color:var(--line)");
      });
    });
    expect(render({ times: [], style })).toContain("No records yet");
    expect(elementAt(render({ times: [], style, loading: true }), "home/c1/root").children).toHaveLength(3);
  });
  it("can draw the slot outline and surface for a loading screen without adding targets", () => {
    const html = render({ times, loading: true, loadingOutline: true });
    const [row] = elementAt(html, "home/c1/root").children;
    expect(row?.attributes).toContain('aria-hidden="true"');
    expect(styleAt(html, row!)).toContain("var(--line)");
    expect(styleAt(html, row!)).toContain("background-color:var(--surface)");
    expect(html).not.toContain('role="button"');
  });
  it("uses a custom drawing part without changing slot root addresses", () => {
    const html = render({ times, part: "times" });
    expect(elementAt(html, "home/c1/times").children).toHaveLength(3);
    expect(elementAt(html, "home/c1/r1/root").attributes).toContain('role="button"');
    expect(elementAt(html, "home/c1/r1/time")).toEqual(
      elementAt(html, "home/c1/r1/root").children[0]!.children[0],
    );
  });
});
