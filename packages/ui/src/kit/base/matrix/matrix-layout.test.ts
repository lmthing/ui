import { describe, expect, it, vi } from "vitest";
import { component, size } from "@lmthing/ui/catalog";
import { loadingGeometry, matrixKey, transposeWeek } from "./matrix-layout";

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

describe("matrix child loading geometry", () => {
  it("matches controls, icons, initials and every photo aspect", () => {
    expect(loadingGeometry({ done: false })).toEqual({ width: size.control.md, height: size.control.md });
    expect(loadingGeometry({ hint: "Score" })?.minHeight).toBe(
      size.control.md + component.base.borderWidth * 2,
    );
    expect(loadingGeometry({ name: "plus", scale: "lg" })).toEqual({
      width: size.icon.lg,
      height: size.icon.lg,
    });
    expect(loadingGeometry({ initials: "AB", shape: "wide" })).toEqual({
      width: size.avatar.md,
      height: size.avatar.md,
    });
    for (const [shape, ratio] of [
      ["wide", component.base.wideRatio],
      ["tall", component.base.tallRatio],
      ["square", 1],
    ] as const)
      expect(loadingGeometry({ photo: "lib:object", shape })).toEqual({ width: "100%", aspectRatio: ratio });
    expect(loadingGeometry({ photo: "lib:object", shape: "avatar" })).toEqual({
      width: size.avatar.lg,
      height: size.avatar.lg,
    });
    expect(loadingGeometry({})).toBeUndefined();
  });
});
