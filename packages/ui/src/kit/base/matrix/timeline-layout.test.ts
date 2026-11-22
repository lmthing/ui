import { expect, it } from "vitest";
import { timelineLayout } from "./timeline-layout";

it("fits unsorted spans and gaps exactly inside the time slots without duplicating the program", () => {
  const first = { id: "r1", start: 1, span: 2, content: null };
  const second = { id: "r2", start: 4, span: 2, content: null };
  expect(timelineLayout([second, first], 7)).toEqual([
    { start: 0, span: 1 },
    { start: 1, span: 2, cell: first },
    { start: 3, span: 1 },
    { start: 4, span: 2, cell: second },
    { start: 6, span: 1 },
  ]);
});

it("rejects impossible bounds, overlaps, and ambiguous missing geometry", () => {
  const valid = { id: "r1", start: 0, span: 3, content: null };
  for (const ending of [
    { start: -1 },
    { span: 0 },
    { span: NaN },
    { start: 0.5 },
    { span: 5 },
    { start: 1 },
  ]) {
    expect(timelineLayout([valid, { ...valid, ...ending, id: "r2" }], 4)).toEqual([
      { start: 0, span: 3, cell: valid },
      { start: 3, span: 1 },
    ]);
  }
  expect(timelineLayout([{ id: "missing", content: null }], 4)).toEqual([{ start: 0, span: 4 }]);
  expect(timelineLayout([], 0)).toEqual([]);
});
