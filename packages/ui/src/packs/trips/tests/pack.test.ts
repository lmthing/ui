import { readFileSync } from "node:fs";
import { URL } from "node:url";
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

const scoped = createRegistry({ packs: ["trips"], includeDrafts: true });
const ids = [
  "Itinerary",
  "Reservation",
  "PackingList",
  "Weather",
  "TravelDocs",
  "Converter",
  "Clocks",
  "FlightStatus",
];
const packLayouts = {
  "trips_all/list": ["Header", "List", "Button"],
  "trip/overview": ["Header", "Timer", "Weather", "Itinerary", "Button"],
  "day/today": ["Header", "Timeline", "MapPins", "Reservation"],
  "bookings/list": ["Header", "Segmented", "List"],
  "bookings/docs": ["Header", "Segmented", "TravelDocs"],
  "bookings/pass": ["Header", "Reservation", "KeyValue"],
  "prep/packing": ["Header", "Timer", "PackingList"],
  "prep/tools": ["Header", "Converter", "Clocks"],
};

it("isolates Trips and scopes Writer choices until the pack is complete", () => {
  const core = createRegistry();
  const live = createRegistry({ packs: ["trips"] });
  const ready = packReady("trips");
  expect(
    Object.entries(packOf)
      .filter(([, owner]) => owner === "trips")
      .map(([id]) => id)
      .sort(),
  ).toEqual([...ids].sort());
  expect(scoped.ids).not.toContain("Slots");
  if (!ready) expect(live.ids).toEqual(core.ids);
  const [draftFormat, liveFormat] = [scoped, live].map((registry) => JSON.stringify(writerFormat(registry)));
  for (const id of ids) {
    expect(core.ids).not.toContain(id);
    expect(scoped.ids).toContain(id);
    expect(draftFormat).toContain(`"const":"${id}"`);
    expect(liveFormat!.includes(`"const":"${id}"`)).toBe(ready);
  }
  for (const name of ["trips_all", "trip", "day", "bookings", "prep"]) {
    expect(core.archetypes).not.toHaveProperty(name);
    expect(scoped.archetypes).toHaveProperty(name);
    expect(Object.hasOwn(live.archetypes, name)).toBe(ready);
  }
});

it("validates shared checks and the exact worked-example lines", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  const text = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
  expect(packExamples.trips).toBe(text);
  const lines = text
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  for (const { c, id: _id, ...props } of lines)
    expect(scoped.schema(c)?.safeParse(props).success, c).toBe(true);
  expect(lines.map(({ c }) => c)).toEqual(expect.arrayContaining([...ids, "Route"]));
  expect(lines.find(({ c }) => c === "Itinerary")?.days).toHaveLength(10);
  const packed = lines
    .find(({ c }) => c === "PackingList")
    ?.groups.flatMap(({ items }: { items: { packed: boolean }[] }) => items.map(({ packed }) => packed));
  expect(packed).toHaveLength(10);
  expect(packed.filter(Boolean)).toHaveLength(7);
});

it("validates the exact recipe and compose defaults for all eight layouts", () => {
  const cast = { things: [], items: [] };
  const defs = Object.fromEntries(scoped.defs.map((def) => [def.meta.id, def])) as Record<string, Definition>;
  expect(packComposeProbes.trips.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
    Object.keys(packLayouts).sort(),
  );
  for (const [path, order] of Object.entries(packLayouts)) {
    const [archetype, layout] = path.split("/") as [string, string];
    const screen = scoped.defaultLines(archetype, layout, cast);
    const meta = scoped.archetypes[archetype]!.meta;
    expect(
      screen.components.map(({ c }) => c),
      path,
    ).toEqual(order);
    expect(scoreComposition(JSON.stringify(screen), meta, layout, defs).issues, path).toEqual([]);
  }
});
