import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkPacks,
  checkScreen,
  components,
  createRegistry,
  packArchetypes,
  packComposeProbes,
  packExamples,
  packOf,
  packReady,
  packs,
  writerFormat,
  type ArchetypeMeta,
  type Component,
  type Definition,
} from "@lmthing/ui/catalog";
import { example } from "../index";

const exampleIds = ["PlaceCard", "Address", "Hours", "DeliveryTracker", "MapList", "Departures"] as const;
const ids = [...exampleIds, "StationRates"] as const;
const recipes = {
  places: {
    map: ["Header", "Search", "Chips", "MapList"],
    list: ["Header", "Search", "Chips", "List"],
  },
  place: {
    venue: ["Header", "Gallery", "PlaceCard", "Hours", "Address", "Button"],
    walk: ["Header", "Route", "List"],
  },
  tracking: {
    delivery: ["Header", "DeliveryTracker", "KeyValue"],
    departures: ["Header", "Search", "Departures"],
  },
};
const cast = { things: [], items: [] };
const registry = createRegistry({ packs: ["places"], includeDrafts: true });
const definitions: Record<string, Definition> = components;

it("scopes generated contracts and archetypes to places without leaking incomplete entries", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["places"] });
  const ready = packReady("places");
  if (!ready) expect(live.ids).toEqual(core.ids);
  const format = JSON.stringify(writerFormat(registry));
  const coreFormat = JSON.stringify(writerFormat(core));
  for (const id of ids) {
    expect(packOf[id]).toBe("places");
    expect(registry.ids).toContain(id);
    expect(core.ids).not.toContain(id);
    expect(live.ids.includes(id)).toBe(ready);
    expect(format).toContain(`"const":"${id}"`);
    expect(coreFormat).not.toContain(`"const":"${id}"`);
  }
  for (const id of Object.keys(recipes)) {
    expect(Object.hasOwn(core.archetypes, id)).toBe(false);
    expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
    expect(Object.hasOwn(registry.archetypes, id)).toBe(true);
  }
  expect(registry.ids.filter((id) => id in packOf).sort()).toEqual([...ids].sort());
});

it("checks the catalog, every recipe, neutral default and compose probe", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const layoutKeys = [];
  expect(packArchetypes.places.map(({ id }) => id).sort()).toEqual(Object.keys(recipes).sort());
  for (const meta of packArchetypes.places as readonly ArchetypeMeta[]) {
    const expected = recipes[meta.id as keyof typeof recipes] as Record<string, string[]>;
    expect(meta).not.toHaveProperty("status");
    expect(Object.keys(meta.layouts)).toEqual(Object.keys(expected));
    for (const [layout, data] of Object.entries(meta.layouts)) {
      layoutKeys.push(`${meta.id}/${layout}`);
      expect(data.recipe.map(({ allow }) => allow)).toEqual(expected[layout]!.map((id) => [id]));
      const screen = registry.defaultLines(meta.id, layout, cast);
      expect(checkScreen(screen, registry)).toEqual([]);
      expect(screen.components.map(({ c }) => c)).toEqual(expected[layout]);
      for (const { id: _id, c, ...input } of screen.components)
        expect(definitions[c]!.props.safeParse(input).success).toBe(true);
    }
  }
  expect(packComposeProbes.places.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
    layoutKeys.sort(),
  );
  expect(packs.places.probes.filter((probe) => probe.kind === "pack")).toHaveLength(3);
  expect(packs.places.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "List" }));
});

it("validates every JSONL record and preserves the Sniff venue and walk", async () => {
  const source = await readFile(new URL("../example.jsonl", import.meta.url), "utf8");
  expect(source).toBe(example);
  expect(source).toBe(packExamples.places);
  const lines: Component[] = source
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  for (const { id, c, ...input } of lines) {
    expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(definitions[c]!.props.safeParse(input).success).toBe(true);
  }
  for (const id of exampleIds) expect(lines.some(({ c }) => c === id)).toBe(true);
  expect(lines.find(({ c }) => c === "PlaceCard")).not.toHaveProperty("photo");
  expect(components.Route.meta.signature).toBe("route_draw");
  expect(lines.find(({ c }) => c === "Route")).toMatchObject({
    stops: [{ label: "Alder Park" }, { label: "Canal Green" }],
  });
});
