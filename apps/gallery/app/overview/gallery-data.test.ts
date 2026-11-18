import { describe, expect, it } from "vitest";
import { components, presets, type Meta } from "@lmthing/ui/catalog";
import { cellsOf, componentIds, groupedIds, groups, modes, variantCount } from "./gallery-data";

describe("gallery overview data", () => {
  it("shows all 45 core components once, in stable group and id order", () => {
    const sections = groupedIds("");
    expect(sections.map(({ group }) => group)).toEqual([...groups]);
    const ids = sections.flatMap((section) => section.ids);
    expect(ids).toHaveLength(45);
    expect(new Set(ids).size).toBe(45);
    expect([...ids].sort()).toEqual(componentIds);
    for (const section of sections) expect(section.ids).toEqual([...section.ids].sort());
  });

  it("matches id or purpose without case or surrounding whitespace", () => {
    expect(groupedIds(" liST ").flatMap(({ ids }) => ids)).toContain("List");
    expect(groupedIds("TAPPABLE").flatMap(({ ids }) => ids)).toContain("List");
    expect(groupedIds("no_such_component")).toEqual([]);
    expect(groupedIds(" \t ")).toEqual(groupedIds(""));
  });

  it.each(componentIds)("preserves %s's existing grid and first filled preview", (id) => {
    const { examples, meta } = components[id];
    const states = (meta as Meta).states ?? ["filled"];
    const cells = cellsOf(id);
    expect(cells[0]).toEqual({ id, example: examples[0], index: 0, state: "filled" });
    expect(cells.slice(0, examples.length)).toEqual(
      examples.map((example, index) => ({ id, example, index, state: "filled" })),
    );
    expect(cells.slice(examples.length)).toEqual(
      states
        .filter((state) => state !== "filled")
        .map((state) => ({ id, example: examples[0], index: 0, state })),
    );
    expect(variantCount(id)).toBe(cells.length * presets.length * modes.length);
  });

  it("retains List's 48 previews, rather than multiplying every example by every state", () => {
    expect(cellsOf("List")).toHaveLength(8);
    expect(variantCount("List")).toBe(48);
  });
});
