import { describe, expect, it } from "vitest";
import { heatCells, heatGrid, heatReading } from "../../copy";

describe("Heatmap data and copy", () => {
  it("transposes week-major input into Monday-first rows and stable display-order ids", () => {
    const input = {
      style: "weeks",
      unit: "checks",
      weeks: [
        [0, 1],
        [2, 4],
      ],
    } as const;
    expect(heatCells(input).map(({ id, value }) => [id, value])).toEqual([
      ["r1", 0],
      ["r2", 2],
      ["r3", 1],
      ["r4", 4],
    ]);
    const { columns, rows, legend } = heatGrid(input);
    expect(columns.map(({ label }) => label)).toEqual(["W1", "W2"]);
    expect(rows[0]!.cells[1]).toEqual({ id: "r2", level: 0.5, label: "Monday, Week 2: 2 checks" });
    expect(legend).toEqual([
      { level: 0, label: "0" },
      { level: 0.5, label: "2" },
      { level: 1, label: "4" },
    ]);
  });

  it("localizes exact cell values and keeps signed data in scale order", () => {
    const input = { style: "hours", unit: "kg", days: [[-1.5, 0, 1.5]] } as const;
    const { columns, rows, legend } = heatGrid(input, "de-DE");
    expect(columns.map(({ label }) => label)).toEqual(["00h", "02h", "04h"]);
    expect(rows[0]!.cells.map(({ level }) => level)).toEqual([0, 0.5, 1]);
    expect(rows[0]!.cells[0]!.label).toBe("Monday, 00:00: -1,5 kg");
    expect(legend.map(({ label }) => label)).toEqual(["-1,5", "0", "1,5"]);
    expect(heatReading(input, "de-DE")).toContain("Monday: -1,5 · 0 · 1,5");
  });

  it("handles all-zero, constant-negative, and full finite numeric ranges", () => {
    const grid = (days: number[][]) => heatGrid({ style: "hours", unit: "kg", days });
    expect(grid([[0, 0]]).legend).toEqual([{ level: 0, label: "0" }]);
    expect(grid([[-2, -2]]).legend).toEqual([{ level: 0, label: "-2" }]);
    const extreme = grid([[-Number.MAX_VALUE, 0, Number.MAX_VALUE]]);
    expect(extreme.rows[0]!.cells.map(({ level }) => level)).toEqual([0, 0.5, 1]);
    expect(extreme.legend.map(({ level }) => level)).toEqual([0, 0.5, 1]);
  });
});
