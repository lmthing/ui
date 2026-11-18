import { describe, expect, it } from "vitest";
import { components, packOf, presets, type Meta } from "@lmthing/ui/catalog";
import { cellsOf, componentIds, groupedIds, groups, modes, variantCount } from "./gallery-data";

describe("gallery overview data", () => {
  it("shows all 45 core components once, in stable group and id order", () => {
    const sections = groupedIds("");
    expect(sections.map(({ group }) => group)).toEqual([...groups, "booking"]);
    const ids = sections.flatMap((section) => section.ids);
    expect(ids).toHaveLength(51);
    expect(new Set(ids).size).toBe(51);
    expect([...ids].sort()).toEqual(componentIds);
    for (const section of sections) expect(section.ids).toEqual([...section.ids].sort());
  });
  it("filters by pack, keeping ready and draft components together and excluding core", () => {
    const sections = groupedIds("", "booking");
    expect(sections.map(({ group }) => group)).toEqual(["booking"]);
    expect(sections.flatMap(({ ids }) => ids)).toEqual(Object.keys(packOf).sort());
    expect(groupedIds("Waitlist", "booking")[0]?.ids).toEqual(["Waitlist"]);
    expect(groupedIds("", "unknown")).toEqual([]);
  });

  it("matches id or purpose without case or surrounding whitespace", () => {
    expect(groupedIds(" liST ").flatMap(({ ids }) => ids)).toContain("List");
    expect(groupedIds("TAPPABLE").flatMap(({ ids }) => ids)).toContain("List");
    expect(groupedIds("no_such_component")).toEqual([]);
    expect(groupedIds("List Several")).toEqual([]);
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
