import { selectedIds } from "../../../../scripts/build";
import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const ids = ["Ingredients", "CookSteps", "MealPlan", "GroceryList", "Pantry", "FoodLog", "KitchenTimers"];
const defs = components as Record<string, Definition>;
const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "record", fields: ["label", "detail"] }],
    items: [{ id: "one", type: "record", sample: true, label: "Example", detail: "Details" }],
  },
  {
    things: [{ type: "record", fields: ["label", "detail"] }],
    items: Array.from({ length: 30 }, (_, index) => ({
      id: `item_${index}`,
      type: "record",
      sample: false,
      label: "x".repeat(300),
      detail: "y".repeat(300),
    })),
  },
  { things: [], items: [{ id: "one", type: "record", sample: true, label: 4 }] },
];

describe.each(selectedIds(ids))("%s contract", (id) => {
  const def = defs[id]!;
  it("accepts domain examples and neutral, populated and malformed cast fallbacks", () => {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
    for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    const neutral = JSON.stringify(def.fallback({ cast: casts[0]! }));
    if (!["MealPlan", "FoodLog", "CookSteps"].includes(id)) expect(neutral).toContain(placeholderTitle(0));
    expect(JSON.stringify(def.fallback({ cast: casts[1]! }))).toContain("Example");
  });
  it("rejects unknown keys, raw presentation and validator-owned rows", () => {
    for (const extra of [{ unknown: true }, { color: "red" }, { size: 20 }, { rows: [] }])
      expect(def.props.safeParse({ ...(def.examples[0] as object), ...extra }).success).toBe(false);
  });
  it("keeps full metadata and an actionable core-first probe", () => {
    expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(def.meta.tier).toBe("phone");
    expect(def.meta.realPath).not.toBe("");
    expect(def.probes.filter((probe) => probe.kind === "choose").length).toBeGreaterThanOrEqual(2);
    expect(
      def.probes.some(
        (probe) => probe.kind === "choose" && probe.expect !== id && ids.every((id) => id !== probe.expect),
      ),
    ).toBe(true);
    expect(def.probes.some((probe) => probe.kind === "write" && probe.expect === id)).toBe(true);
    const input = stampItemIds(def.meta, def.props.parse(def.examples[0]));
    const actions = affordancesOf(def.meta, input, `${id[0]!.toLowerCase()}1`);
    for (const probe of def.probes.filter((probe) => probe.kind === "read"))
      expect(actions).toContainEqual(expect.objectContaining(probe.expect));
    expect(readComponent(def, def.examples[0], `${id[0]!.toLowerCase()}1`).join("\n")).not.toContain(
      "undefined",
    );
  });
});
