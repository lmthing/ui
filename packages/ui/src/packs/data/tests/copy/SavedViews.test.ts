import { expect, it } from "vitest";
import { savedViewCopy, savedViewCounts, savedViewMatchKind } from "../../copy";

const rows = [
  { id: "r1", viewId: "all", label: "All walks", layout: "table" as const },
  { id: "r2", viewId: "today", label: "Today" },
  { id: "r3", viewId: "overdue", label: "Overdue" },
];

it("counts distinct matching records across presets, not input tallies or unrelated records", () => {
  const counts = savedViewCounts(rows, {
    [savedViewMatchKind]: [
      { id: "one", viewIds: ["all", "today", "today"], count: 100 },
      { id: "one", viewIds: ["today"] },
      { id: "two", viewIds: ["all", "missing"] },
      { id: "", viewIds: ["overdue"] },
      { id: "three", viewIds: "overdue" },
    ],
    unrelated: [{ id: "four", viewIds: ["overdue"] }],
  });
  expect([...counts!]).toEqual([
    ["all", 2],
    ["today", 1],
    ["overdue", 0],
  ]);
});

it("distinguishes an absent dataset from an empty one and localizes count copy", () => {
  expect(savedViewCounts(rows)).toBeUndefined();
  expect(savedViewCounts(rows, { [savedViewMatchKind]: [] })?.get("all")).toBe(0);
  const row = rows[0]!;
  expect(savedViewCopy(row, undefined).chip).toBe("All walks");
  expect(savedViewCopy(row, 0).chip).toBe("All walks · 0");
  expect(savedViewCopy(row, 1).count).toBe("1 match");
  expect(savedViewCopy(row, 2).count).toBe("2 matches");
  expect(savedViewCopy(row, 120, "ar-EG").chip).toMatch(/١٢٠$/);
});
