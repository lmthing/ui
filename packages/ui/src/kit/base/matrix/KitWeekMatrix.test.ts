import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { presets } from "@lmthing/ui/catalog";
import { KitWeekMatrix } from "@lmthing/ui/kit";
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
describe("KitWeekMatrix", () => {
  it.each(presets)("draws both orientations, today, targets, totals and loading in $id", ({ id }) => {
    for (const mode of ["light", "dark"]) {
      for (const orientation of ["daysAcross", "daysDown"] as const) {
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
        for (let index = 0; index < 7; index++)
          expect(html).toContain(`data-testid="home/c1/r1/day${index}"`);
        expect(html).toContain("Total 7");
        expect(html).toContain('aria-disabled="true"');
        const loading = renderMatrix(createElement(KitWeekMatrix, { ...props, loading: true }));
        expect(loading).not.toContain('role="button"');
        expect(loading).toContain('aria-busy="true"');
        expect(renderMatrix(createElement(KitWeekMatrix, { ...props, rows: [] }))).not.toContain("Value");
      }
    }
  });
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
