import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { presets, space } from "@lmthing/ui/catalog";
import { KitCheck, KitColumns, KitRow } from "@lmthing/ui/kit";
import { elementAt, styleAt } from "../../../../test/render";
import { renderMatrix, text } from "./matrix-drawing.test";

const columns = [
  {
    id: "a",
    label: "First group",
    count: "2",
    summary: text("Caller summary"),
    children: createElement(KitRow, {
      item: "r1",
      label: "Caller action",
      children: createElement(KitCheck, { label: "Caller action", part: "check", done: true }),
    }),
  },
  { id: "b", label: "Empty group", count: "0", children: null },
];
describe("KitColumns", () => {
  it.each(presets)("draws counted and empty columns in both styles in $id", ({ id }) => {
    for (const mode of ["light", "dark"]) {
      for (const style of ["columns", "stack"] as const) {
        const html = renderMatrix(
          createElement(KitColumns, { columns, style, part: "groups" }),
          undefined,
          id,
          mode,
        );
        expect(html).toContain("First group");
        expect(html).toContain("Empty group");
        expect(html).toContain("Caller summary");
        expect(html.match(/data-testid="home\/c1\/groups"/g)).toHaveLength(1);
        expect(elementAt(html, "home/c1/r1/check").attributes).toContain('role="checkbox"');
        const loading = renderMatrix(createElement(KitColumns, { columns, style, loading: true }));
        expect(loading).toContain('aria-busy="true"');
        expect(loading).not.toContain('role="checkbox"');
        expect(loading).not.toContain('data-testid="home/c1/r1/check"');
        if (style === "stack")
          expect(styleAt(html, elementAt(html, "home/c1/groups").children[0]!)).toContain(
            `gap:${space.md}px`,
          );
      }
    }
  });
  it("draws the zero-column states without inventing caller copy", () => {
    for (const loading of [false, true]) {
      const html = renderMatrix(createElement(KitColumns, { columns: [], loading }));
      expect(html).toContain(`aria-busy="${loading}"`);
      expect(html).not.toContain('role="checkbox"');
    }
  });
});
