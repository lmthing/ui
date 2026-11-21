import { describe, expect, it } from "vitest";
import { tableCell, tableChoices, tableCount, tableReading, tableRows } from "../../copy";

const columns = [
  { label: "Value", kind: "number" },
  { label: "Value", kind: "status" },
] as const;

describe("Table copy", () => {
  it("formats typed values and leaves authored text and status unchanged", () => {
    expect(tableCell(1234.5, "number", "de-DE")).toBe("1234,5");
    expect(tableCell(1234.5, "money", "en-GB")).toBe("US$1,234.50");
    expect(tableCell("2026-11-20", "date", "de-DE")).toBe("20. Nov. 2026");
    expect(tableCell(" Ready ", "text")).toBe(" Ready ");
    expect(tableCell("In review", "status")).toBe("In review");
    expect(tableCount(1)).toBe("1 row");
    expect(tableCount(2, "de-DE")).toBe("2 rows");
  });

  it("gives identically named columns distinct choices without changing their indices", () => {
    expect(tableChoices(columns)).toEqual([
      { label: "1. Value", value: 0 },
      { label: "2. Value", value: 1 },
    ]);
  });

  it("sorts by typed value, keeps original order for ties, and reads stable row ids", () => {
    const rows = [{ cells: [10, "Ready"] }, { cells: [2, "Pending"] }, { cells: [2, "Review"] }];
    expect(tableRows(rows, columns)).toBe(rows);
    expect(tableRows(rows, columns, 0)).toEqual([rows[1], rows[2], rows[0]]);
    expect(rows[0]?.cells[0]).toBe(10);
    expect(tableReading({ columns, rows, sort: 0, detail: "brief" })).toEqual([
      "1. Value · 2. Value",
      "r2: 2 · Pending",
      "r3: 2 · Review",
      "r1: 10 · Ready",
    ]);
  });
});
