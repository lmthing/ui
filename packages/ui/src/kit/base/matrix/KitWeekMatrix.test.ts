import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { presets } from "@lmthing/ui/catalog";
import { KitWeekMatrix } from "@lmthing/ui/kit";
import { elementAt, styleAt } from "../../../../test/render";
import { renderMatrix, text } from "./matrix-drawing.test";

const days = Array.from({ length: 7 }, (_, index) => ({
  id: `d${index}`,
  label: `Day ${index}`,
  header: text(`Day ${index}`),
}));
const rows = [
  {
    id: "r1",
    label: "First",
    heading: text("First"),
    cells: days.map((day, index) => ({
      id: day.id,
      content: text(`Value ${index}`),
      target: { item: "r1", part: `day${index}` },
      disabled: index === 6,
    })),
  },
];
const cases = presets.flatMap(({ id }) =>
  ["light", "dark"].flatMap((mode) =>
    (["daysAcross", "daysDown"] as const).map((orientation) => ({ id, mode, orientation })),
  ),
);
describe("KitWeekMatrix", () => {
  it.each(cases)(
    "draws $orientation with today, targets, totals and loading in $id/$mode",
    ({ id, mode, orientation }) => {
      const props = {
        days,
        rows,
        corner: text("Week"),
        today: "d2",
        orientation,
        trailing: [{ row: "r1", content: text("Total 7") }],
        part: "week",
      };
      const html = renderMatrix(createElement(KitWeekMatrix, props), undefined, id, mode);
      expect(html.match(/data-testid="home\/c1\/week"/g)).toHaveLength(1);
      for (const day of days) expect(html).toContain(day.label);
      for (let index = 0; index < 7; index++) expect(html).toContain(`data-testid="home/c1/r1/day${index}"`);
      expect(html).toContain("Total 7");
      expect(html).toContain('aria-disabled="true"');
      const loading = renderMatrix(createElement(KitWeekMatrix, { ...props, loading: true }));
      expect(loading).not.toContain('role="button"');
      expect(loading).toContain('aria-busy="true"');
      expect(renderMatrix(createElement(KitWeekMatrix, { ...props, rows: [] }))).not.toContain("Value");
    },
  );
  it("requires exactly seven day headers", () => {
    for (const count of [0, 6, 8])
      expect(() =>
        renderMatrix(
          createElement(KitWeekMatrix, {
            days: Array.from({ length: count }, () => days[0]!),
            rows,
            corner: null,
          }),
        ),
      ).toThrow("exactly seven");
  });
});

describe("KitWeekMatrix transposition integrity", () => {
  it("keeps selected row headers, child item parts, and today's row after transposition", () => {
    const selected = rows.map((row) => ({
      ...row,
      selected: true,
      heading: text("First", "name"),
      target: { item: row.id, part: "root" },
    }));
    const html = renderMatrix(
      createElement(KitWeekMatrix, {
        days,
        rows: selected,
        corner: null,
        orientation: "daysDown",
        today: "d2",
      }),
    );
    expect(elementAt(html, "home/c1/r1/root").attributes).toContain('aria-pressed="true"');
    expect(elementAt(html, "home/c1/r1/name").attributes).toContain('data-testid="home/c1/r1/name"');
    expect(styleAt(html, "home/c1/r1/day2")).toContain("var(--accentSoft)");
    const unselected = renderMatrix(
      createElement(KitWeekMatrix, { days, rows, corner: null, orientation: "daysDown", today: "d2" }),
    );
    expect(styleAt(unselected, "home/c1/r1/day0")).not.toContain("var(--accentSoft)");
  });
  it("omits empty totals and keeps empty days-down calm", () => {
    const html = renderMatrix(
      createElement(KitWeekMatrix, {
        days,
        rows: [],
        corner: text("Week"),
        trailing: [],
        orientation: "daysDown",
      }),
    );
    expect(html).toContain("Week");
    expect(html).not.toContain("Day 0");
    expect(html).not.toContain("Total");
  });
});

describe("KitWeekMatrix trailing item parts", () => {
  it.each(["daysAcross", "daysDown"] as const)("keeps each total in its source row in %s", (orientation) => {
    const items = ["r1", "r2"].map((id) => ({
      id,
      label: id,
      heading: text(id),
      cells: days.map((day) => ({ id: day.id, content: null })),
    }));
    const input = {
      days,
      rows: items,
      corner: text("Week"),
      orientation,
      trailing: items.map((row) => ({ row: row.id, content: text("4 of 7", "total") })),
    };
    const html = renderMatrix(createElement(KitWeekMatrix, input));
    for (const row of items)
      expect(html.match(new RegExp(`data-testid="home/c1/${row.id}/total"`, "g"))).toHaveLength(1);
    expect(html).not.toContain('data-testid="home/c1/total"');
    const loading = renderMatrix(createElement(KitWeekMatrix, { ...input, loading: true }));
    expect(loading).not.toMatch(/data-testid="home\/c1\/r\d+\/total"/);
  });
});
