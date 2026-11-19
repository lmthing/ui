import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkPacks,
  checkScreen,
  components,
  createRegistry,
  packArchetypes,
  packComposition,
  packExamples,
  packOf,
  packReady,
  packs,
  writerFormat,
  type Definition,
} from "@lmthing/ui/catalog";
import { example } from "../index";

const ids = ["Ingredients", "CookSteps", "MealPlan", "GroceryList", "Pantry", "FoodLog", "KitchenTimers"];
const layouts = {
  recipe: ["overview", "cook"],
  mealweek: ["week"],
  groceries: ["list", "pantry"],
  food: ["day", "add"],
  recipes: ["browse"],
};
const cast = { things: [], items: [] };
const definitions = components as Record<string, Definition>;

describe("kitchen scaffold", () => {
  it("generates all contracts and isolates the incomplete pack from core", () => {
    const core = createRegistry();
    const live = createRegistry({ packs: ["kitchen"] });
    const draft = createRegistry({ packs: ["kitchen"], includeDrafts: true });
    const ready = packReady("kitchen");
    if (!ready) expect(live.ids).toEqual(core.ids);
    expect(ids.filter((id) => draft.ids.includes(id))).toEqual(ids);
    expect(ids.filter((id) => core.ids.includes(id))).toEqual([]);
    const format = JSON.stringify(writerFormat(draft));
    const liveFormat = JSON.stringify(writerFormat(live));
    for (const id of ids) {
      expect(packOf[id as keyof typeof packOf]).toBe("kitchen");
      expect(format).toContain(`"const":"${id}"`);
      expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready);
    }
    for (const id of Object.keys(layouts)) {
      expect(Object.hasOwn(core.archetypes, id)).toBe(false);
      expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
      expect(Object.hasOwn(draft.archetypes, id)).toBe(true);
    }
  });
  it("checks pack metadata, every layout, defaults and core-only dependencies", () => {
    expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
    expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
    const registry = createRegistry({ packs: ["kitchen"], includeDrafts: true });
    expect(packArchetypes.kitchen).toHaveLength(5);
    for (const meta of packArchetypes.kitchen) {
      expect(meta).not.toHaveProperty("status");
      expect(Object.keys(meta.layouts)).toEqual(layouts[meta.id as keyof typeof layouts]);
      expect(Object.keys(packComposition(meta).layouts)).toEqual(Object.keys(meta.layouts));
      for (const [layout, data] of Object.entries(meta.layouts)) {
        for (const slot of data.recipe)
          for (const id of slot.allow)
            expect(!(id in packOf) || packOf[id as keyof typeof packOf] === "kitchen").toBe(true);
        const screen = registry.defaultLines(meta.id, layout, cast);
        expect(checkScreen(screen, registry)).toEqual([]);
        expect(screen.components.map((line) => line.c)).toEqual(data.defaults.map((line) => line.c));
      }
    }
    expect(packs.kitchen.probes.filter((probe) => probe.kind === "pack").length).toBeGreaterThanOrEqual(3);
    expect(packs.kitchen.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timer" }));
  });
  it("validates every worked-example line and the root example door", async () => {
    const source = await readFile(new URL("../example.jsonl", import.meta.url), "utf8");
    const lines = source
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(source).toBe(example);
    expect(packExamples.kitchen).toBe(source);
    expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length);
    for (const { id, c, ...input } of lines) {
      expect(typeof id).toBe("string");
      expect(definitions[c]!.props.safeParse(input).success).toBe(true);
    }
    for (const id of ids) expect(lines.some((line) => line.c === id)).toBe(true);
  });
});
