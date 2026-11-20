import { describe, expect, it, vi } from "vitest";
import { components, packOf, presets, type Meta } from "@lmthing/ui/catalog";
import {
  cellKey,
  cellsOf,
  componentIds,
  groupAnchor,
  groupedIds,
  groups,
  modes,
  variantCount,
} from "./gallery-data";

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
    const query = new URLSearchParams("?pack=booking");
    const sections = groupedIds("", query);
    expect(sections.map(({ group }) => group)).toEqual(["booking"]);
    expect(sections.map(groupAnchor)).toEqual(["booking"]);
    expect(sections.flatMap(({ ids }) => ids)).toEqual(
      Object.entries(packOf)
        .filter(([, pack]) => pack === "booking")
        .map(([id]) => id)
        .sort(),
    );
    expect(groupedIds("Waitlist", query)[0]?.ids).toEqual(["Waitlist"]);
    expect(groupedIds("", new URLSearchParams("?pack=unknown"))).toEqual([]);
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

it("shows ?pack=data components once without changing the core data group", async () => {
  const ownership: Record<string, string> = packOf;
  // The data pack is not mounted on main yet. Stand it up with existing pack cards until it is.
  const owners = Object.values(ownership).includes("data")
    ? ownership
    : { ...ownership, PriceChart: "data", Transactions: "data" };
  const packIds = componentIds.filter((id) => owners[id] === "data");
  const coreIds = componentIds.filter((id) => !(id in packOf) && components[id].meta.group === "data");
  vi.resetModules();
  vi.doMock("@lmthing/ui/catalog", async (original) => ({
    ...(await original<typeof import("@lmthing/ui/catalog")>()),
    packOf: owners,
  }));
  try {
    const { groupAnchor, groupedIds } = await import("./gallery-data");
    const packSection = { kind: "pack", group: "data", ids: packIds };
    const coreSection = { kind: "core", group: "data", ids: coreIds };
    expect(packIds.length).toBeGreaterThan(0);
    expect(coreIds.length).toBeGreaterThan(0);
    expect(groupedIds("", new URLSearchParams("?pack=data"))).toEqual([packSection]);
    expect(groupedIds("", new URLSearchParams("?group=data"))).toEqual([coreSection]);
    expect(groupedIds("", new URLSearchParams("?pack=data&group=data"))).toEqual([packSection]);
    const dataSections = groupedIds("").filter(({ group }) => group === "data");
    expect(dataSections).toEqual([coreSection, packSection]);
    expect(dataSections.map(groupAnchor)).toEqual(["data", "pack-data"]);
  } finally {
    vi.doUnmock("@lmthing/ui/catalog");
    vi.resetModules();
  }
});

it("shows each List example and one preview per non-filled state", () => {
  const { examples, meta } = components.List;
  const cells = examples.length + meta.states.filter((state) => state !== "filled").length;
  expect(cellsOf("List")).toHaveLength(cells);
  expect(variantCount("List")).toBe(cells * presets.length * modes.length);
});
