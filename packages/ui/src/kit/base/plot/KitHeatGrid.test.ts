import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, size, themeName } from "@lmthing/ui/catalog";
import { KitHeatGrid, KitProvider, PartScope } from "@lmthing/ui/kit";
import { addressedElements, config, elementAt, styleAt } from "../../../../test/render";

type Props = Parameters<typeof KitHeatGrid>[0];
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
function render(props: Props) {
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
          createElement(KitHeatGrid, props),
        ),
      ),
    ),
  );
}
const columns = [
  { id: "a", label: "Apr" },
  { id: "b", label: "May" },
  { id: "c", label: "Jun" },
];
const legend = [
  { label: "None", level: 0 },
  { label: "Some", level: 2 },
  { label: "Most", level: 4 },
];
const rows = [
  {
    id: "mon",
    label: "Mon",
    cells: [
      { id: "r1", level: 0, label: "Monday, April: zero" },
      { id: "r2", level: 2, label: "Monday, May: two" },
      { id: "r3", level: 4, label: "Monday, June: four" },
    ],
  },
  { id: "tue", label: "Tue", cells: [{ id: "r4", level: 8, label: "Tuesday, April: eight" }] },
];
const input = { part: "heat", rows, columns, legend, style: "weeks" } as const;
const mark = (html: string, item: string) => styleAt(html, `home/c1/${item}/root`);

describe("KitHeatGrid", () => {
  it("draws caller axes and legend with static item roots, and aligns missing slots without inventing items", () => {
    const html = render(input);
    expect([...addressedElements(html).keys()]).toEqual([
      "home/c1/heat",
      "home/c1/r1/root",
      "home/c1/r2/root",
      "home/c1/r3/root",
      "home/c1/r4/root",
    ]);
    expect(elementAt(html, "home/c1/r2/root").attributes).toContain('aria-label="Monday, May: two"');
    expect(html).not.toContain('role="button"');
    for (const label of ["Mon", "Tue", "Apr", "May", "Jun", "None", "Some", "Most"])
      expect(html).toContain(`>${label}<`);
  });

  it("draws zero distinctly and maps matching legend/cell levels to the same theme fill", () => {
    const html = render(input);
    const entries = elementAt(html, "home/c1/heat").children[1]!.children;
    const mid = component.base.shareFloor + (1 - component.base.shareFloor) / 2;
    expect(mark(html, "r1")).toContain("background-color:var(--raised)");
    expect(mark(html, "r2")).toContain("background-color:var(--accent)");
    expect(mark(html, "r2")).toContain(`opacity:${mid}`);
    expect(styleAt(html, entries[1]!.children[0]!)).toContain(`opacity:${mid}`);
    expect(mark(html, "r4")).toBe(mark(html, "r3"));
    expect(mark(render({ ...input, legend: [] }), "r3")).toContain(`opacity:${mid}`);
  });

  it("renders an intentional empty state only when no cells are supplied, not when all values are zero", () => {
    const empty = render({ ...input, rows: [] });
    expect(empty).toContain("<svg");
    expect(empty).not.toContain(">Apr<");
    const zero = render({ ...input, columns: columns.slice(0, 1), rows: rows.slice(0, 1) });
    expect(zero).toContain('data-testid="home/c1/r1/root"');
    expect(zero).not.toContain('data-testid="home/c1/r2/root"');
  });

  it.each([
    ["weeks", size.avatar.sm],
    ["hours", size.control.md],
  ] as const)(
    "keeps %s cell geometry while loading, with no cell addresses or exposed labels",
    (style, box) => {
      const filled = render({ ...input, style });
      expect(mark(filled, "r2")).toContain(`height:${box}px`);
      const html = render({ ...input, style, loading: true });
      expect([...addressedElements(html).keys()]).toEqual(["home/c1/heat"]);
      expect(html).toContain('aria-busy="true"');
      expect(html).not.toMatch(/Monday|>Apr<|>Most</);
      expect(html.match(new RegExp(`_height-${box}px\\b`, "g"))?.length).toBeGreaterThanOrEqual(6);
    },
  );
});
