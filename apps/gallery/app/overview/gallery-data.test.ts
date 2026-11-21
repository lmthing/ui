import { describe, expect, it } from "vitest";
import { components, packOf, presets, type Meta } from "@lmthing/ui/catalog";
import {
  cellKey,
  cellsOf,
  componentIds,
  groupedIds,
  groups,
  modes,
  screenPresets,
  variantCount,
} from "./gallery-data";

it("selects only requested screen presets in catalog order and keeps the unfiltered gallery", () => {
  expect(screenPresets([])).toEqual(presets);
  expect(screenPresets(["bold"]).map(({ id }) => id)).toEqual(["bold"]);
  expect(screenPresets(["editorial", "bold", "bold"]).map(({ id }) => id)).toEqual(["bold", "editorial"]);
});

describe("gallery overview data", () => {
  it("shows all 45 core components once, in stable group and id order", () => {
    const sections = groupedIds("");
    expect(sections.map(({ group }) => group)).toEqual([
      ...groups,
      ...[...new Set(Object.values(packOf))].sort(),
    ]);
    const ids = sections.flatMap((section) => section.ids);
    expect(ids).toHaveLength(45 + Object.keys(packOf).length);
    expect(new Set(ids).size).toBe(45 + Object.keys(packOf).length);
    expect([...ids].sort()).toEqual(componentIds);
    for (const section of sections) expect(section.ids).toEqual([...section.ids].sort());
  });
  it("filters by pack, keeping ready and draft components together and excluding core", () => {
    const sections = groupedIds("", "booking");
    expect(sections.map(({ group }) => group)).toEqual(["booking"]);
    expect(sections.flatMap(({ ids }) => ids)).toEqual(
      Object.entries(packOf)
        .filter(([, pack]) => pack === "booking")
        .map(([id]) => id)
        .sort(),
    );
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
    const { examples, meta }: { examples: readonly unknown[]; meta: Meta } = components[id];
    const states = (meta.states ?? ["filled"]).filter((state) => state !== "filled");
    const baseCount = examples.length + states.length;
    const cells = cellsOf(id);
    expect(cells[0]).toEqual({ id, example: examples[0], index: 0, state: "filled" });
    expect(cells.slice(0, examples.length)).toEqual(
      examples.map((example, index) => ({ id, example, index, state: "filled" })),
    );
    expect(cells.slice(examples.length, baseCount)).toEqual(
      states.map((state) => ({ id, example: examples[0], index: 0, state })),
    );
    expect(cells.slice(baseCount)).toEqual(
      meta.draw && meta.status !== "draft"
        ? examples.map((example, index) => ({ id, example, index, state: "filled", drawn: true }))
        : [],
    );
    expect(new Set(cells.map(cellKey)).size).toBe(cells.length);
    expect(variantCount(id)).toBe(cells.length * presets.length * modes.length);
  });
});

it("shows each List example and one preview per non-filled state", () => {
  const { examples, meta } = components.List;
  const cells = examples.length + meta.states.filter((state) => state !== "filled").length;
  expect(cellsOf("List")).toHaveLength(cells);
  expect(variantCount("List")).toBe(cells * presets.length * modes.length);
});
