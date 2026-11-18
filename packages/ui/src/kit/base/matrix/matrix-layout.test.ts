import { describe, expect, it, vi } from "vitest";
import { size } from "@lmthing/ui/catalog";
import { matrixKey, transposeWeek } from "./matrix-layout";

describe("matrix layout", () => {
  it("transposes headings and preserves caller cells, targets and disabled states", () => {
    const cell = { id: "c1", content: "One", target: { item: "r1", part: "value" }, disabled: true };
    const result = transposeWeek(
      [
        { id: "d1", label: "Monday", header: "Mon" },
        { id: "d2", label: "Tuesday", header: "Tue" },
      ],
      [{ id: "r1", label: "First", heading: "First heading", cells: [cell] }],
    );
    expect(result.columns).toEqual([{ id: "r1", label: "First", header: "First heading" }]);
    expect(result.rows[0]?.cells[0]).toBe(cell);
    expect(result.rows[1]?.cells[0]?.content).toBeNull();
  });
  it("supports keyboard scrolling without intercepting child controls", () => {
    const node = { scrollBy: vi.fn(), clientWidth: 200, scrollLeft: 20, scrollWidth: 800 };
    const preventDefault = vi.fn();
    for (const key of ["ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"])
      matrixKey({ key, target: node, currentTarget: node, preventDefault });
    expect(node.scrollBy.mock.calls.map(([call]) => call.left)).toEqual([
      -size.control.md,
      size.control.md,
      -200,
      200,
      -20,
      780,
    ]);
    matrixKey({ key: "ArrowRight", target: {}, currentTarget: node, preventDefault });
    matrixKey({ key: "Escape", target: node, currentTarget: node, preventDefault });
    expect(node.scrollBy).toHaveBeenCalledTimes(6);
  });
});
