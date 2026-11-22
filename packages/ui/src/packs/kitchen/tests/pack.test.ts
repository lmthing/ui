import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it } from "vitest";
import {
  archetypes,
  buildPackIndex,
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
  themeName,
  writerFormat,
  type ArchetypeMeta,
  type Definition,
} from "@lmthing/ui/catalog";
import { PhoneScreen, type PhoneScreenProps } from "@lmthing/ui/kit";
import { config } from "../../../../test/render";
import { example } from "../index";

const exampleIds = [
  "Ingredients",
  "CookSteps",
  "MealPlan",
  "GroceryList",
  "Pantry",
  "FoodLog",
  "KitchenTimers",
] as const;
const ids = [...exampleIds, "NutritionFacts"] as const;
const layouts = {
  recipe: ["overview", "nutrition", "cook"],
  mealweek: ["week"],
  groceries: ["list", "pantry"],
  food: ["day", "item", "add"],
  recipes: ["browse"],
};
const cast = { things: [], items: [] };
const definitions = components as Record<string, Definition>;
const exampleLines = (source: string): PhoneScreenProps["screen"]["components"] =>
  source
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

it("publishes the ready pack to the Director and only the selected Writer", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["kitchen"] });
  const other = createRegistry({ packs: ["booking"] });
  const ready = defsReady();
  for (const id of exampleIds) expect(definitions[id]!.meta.status).toBe("ready");
  expect(packReady("kitchen")).toBe(ready);
  expect(/^- kitchen:/m.test(buildPackIndex())).toBe(ready);
  expect(live.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual(ready ? [...ids].sort() : []);
  expect(live.ids.filter((id) => core.ids.includes(id))).toEqual(core.ids);
  const unselected = [core, other].map((registry) => JSON.stringify(writerFormat(registry)));
  const liveFormat = JSON.stringify(writerFormat(live));
  for (const id of ids) {
    expect(packOf[id as keyof typeof packOf]).toBe("kitchen");
    expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready);
    for (const format of unselected) expect(format).not.toContain(`"const":"${id}"`);
  }
  for (const id of Object.keys(layouts)) {
    expect(Object.hasOwn(core.archetypes, id)).toBe(false);
    expect(Object.hasOwn(other.archetypes, id)).toBe(false);
    expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
  }
});

const defsReady = () => ids.every((id) => definitions[id]?.meta.status === "ready");
it("checks pack metadata, every layout, defaults and core-only dependencies", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const registry = createRegistry({ packs: ["kitchen"], includeDrafts: true });
  expect(packArchetypes.kitchen).toHaveLength(5);
  for (const meta of packArchetypes.kitchen as readonly ArchetypeMeta[]) {
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
it("keeps food search in one card and recipe browsing in separate cards", () => {
  const registry = createRegistry({ packs: ["kitchen"], includeDrafts: true });
  const food = registry.defaultLines("food", "add", cast).components.find(({ c }) => c === "List");
  const recipes = registry.defaultLines("recipes", "browse", cast).components.find(({ c }) => c === "List");
  expect(food).not.toHaveProperty("surface");
  expect(food).not.toHaveProperty("style");
  expect(recipes).toMatchObject({ style: "cards" });
});
it("keeps the recipe cover and the shared two-column facts grid", () => {
  const registry = createRegistry({ packs: ["kitchen"], includeDrafts: true });
  const facts = registry
    .defaultLines("recipe", "overview", cast)
    .components.find(({ c }) => c === "KeyValue");
  expect(facts).toMatchObject({ arrange: "grid" });
  expect(facts).not.toHaveProperty("style");
  const hero = registry.defaultLines("recipe", "overview", cast).components.find(({ c }) => c === "Hero");
  expect(hero).toMatchObject({ media: "cover" });
  expect(hero).not.toHaveProperty("style");
});
it("validates every worked-example line and the root example door", async () => {
  const source = await readFile(new URL("../example.jsonl", import.meta.url), "utf8");
  const lines = exampleLines(source);
  expect(source).toBe(example);
  expect(packExamples.kitchen).toBe(source);
  expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length);
  for (const { id, c, ...input } of lines) {
    expect(typeof id).toBe("string");
    expect(definitions[c]!.props.safeParse(input).success).toBe(true);
  }
  for (const id of exampleIds) expect(lines.some((line) => line.c === id)).toBe(true);
});
it.each(["calm", "bold", "editorial"] as const)("renders every Supper line in %s", (preset) => {
  const screen = { id: "supper", components: exampleLines(example) };
  const theme = { preset, mode: "light", accent: "moss" } as const;
  const html = renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(PhoneScreen, { screen, theme, interactive: false }),
    ),
  );
  for (const { id } of screen.components) expect(html).toContain(`data-testid="supper/${id}/root"`);
});
