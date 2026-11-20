import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkPacks,
  components,
  createRegistry,
  packArchetypes,
  packComposeProbes,
  packExamples,
  packOf,
  packReady,
  packs,
  scoreComposition,
  writerFormat,
  type Definition,
} from "@lmthing/ui/catalog";

const ids = ["Units", "RentRoll", "Viewings", "Inspections", "Meters"];
const scoped = createRegistry({ packs: ["property"], includeDrafts: true });
const recipes = {
  "portfolio_units/property_register": ["Header", "Search", "Chips", "Units", "Stats"],
  "portfolio_units/property_viewings": ["Header", "Calendar", "Viewings", "Button"],
  "unit/property_unit_detail": ["Header", "Gallery", "KeyValue", "Units"],
  "unit/property_unit_tenants": ["Header", "List", "Note", "Button"],
  "unit/property_unit_meters": ["Header", "Meters", "Note", "Button"],
  "rent_month/property_rent_ledger": ["Header", "RentRoll", "Note"],
  "rent_month/property_rent_receipt": ["Header", "Field", "Field", "Field", "Button"],
  "inspection/property_inspection_rooms": ["Header", "Inspections", "Note"],
  "inspection/property_inspection_report": ["Header", "Inspections", "Note"],
};

it("keeps the default catalog core-only and exposes Property only when requested and eligible", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["property"] });
  const ready = packReady("property");
  expect(scoped.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual([...ids].sort());
  if (!ready) expect(live.ids).toEqual(core.ids);
  const formats = [core, scoped, live].map((registry) => JSON.stringify(writerFormat(registry)));
  for (const id of ids) {
    const choice = `"const":"${id}"`;
    expect(formats.map((format) => format.includes(choice))).toEqual([false, true, ready]);
  }
  for (const { id } of packArchetypes.property) {
    expect(core.archetypes).not.toHaveProperty(id);
    expect(scoped.archetypes).toHaveProperty(id);
    expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
  }
});

it("validates all metadata and every Three Flats line, with only one signature", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const example = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
  expect(packExamples.property).toBe(example);
  const lines = example
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line));
  const defs: Record<string, Definition> = components;
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  for (const { id, c, ...props } of lines)
    expect(scoped.schema(c)?.safeParse(props).success, `${id}/${c}`).toBe(true);
  expect(lines.map(({ c }) => c)).toEqual(expect.arrayContaining(ids));
  expect(lines.flatMap(({ c }) => defs[c]?.meta.signature ?? [])).toEqual(["count_up"]);
});

it("fills all nine recipe layouts from neutral cast defaults and has a probe per layout", () => {
  const defs = Object.fromEntries(scoped.defs.map((def) => [def.meta.id, def]));
  const cast = { things: [], items: [] };
  expect(packComposeProbes.property.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
    Object.keys(recipes).sort(),
  );
  for (const { layouts, defaultLayout } of packArchetypes.property)
    expect(Object.keys(layouts)[0]).toBe(defaultLayout);
  for (const [path, order] of Object.entries(recipes)) {
    const [archetype, layout] = path.split("/") as [string, string];
    const screen = scoped.defaultLines(archetype, layout, cast);
    expect(
      screen.components.map(({ c }) => c),
      path,
    ).toEqual(order);
    expect(
      scoreComposition(JSON.stringify(screen), scoped.archetypes[archetype]!.meta, layout, defs).issues,
      path,
    ).toEqual([]);
  }
});
