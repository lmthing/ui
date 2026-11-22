import { describe, expect, it } from "vitest";
import { tableCell, tableChoices, tableCount, tableReading, tableRows, tableSummary } from "../../copy";

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

  it("computes signed sums, averages and a count without aggregating status values", () => {
    const rows = [{ cells: [-3, "Ready"] }, { cells: [9, "Review"] }];
    expect(tableSummary(columns, rows, "sum")).toEqual({ label: "Total", cells: ["6", undefined] });
    expect(tableSummary(columns, rows, "avg")).toEqual({ label: "Average", cells: ["3", undefined] });
    expect(tableSummary(columns, rows, "count")).toEqual({
      label: "Record count",
      cells: ["2", undefined],
    });
    const large = [{ cells: [Number.MAX_VALUE, "Ready"] }, { cells: [Number.MAX_VALUE, "Ready"] }];
    expect(tableSummary(columns, large, "sum").cells[0]).toBe("Not available");
    expect(tableSummary(columns, large, "avg").cells[0]).toBe(tableCell(Number.MAX_VALUE, "number"));
    const cancelled = [1e16, 1, -1e16].map((value) => ({ cells: [value, "Ready"] }));
    expect(tableSummary(columns, cancelled, "sum").cells[0]).toBe("1");
    expect(tableSummary(columns, cancelled, "avg").cells[0]).toBe(tableCell(1 / 3, "number"));
  });
});
