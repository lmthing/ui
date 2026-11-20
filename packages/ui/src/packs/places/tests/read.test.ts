import { expect, it } from "vitest";
import {
  components,
  planAct,
  readComponent,
  readScreen,
  timeOfDayLine,
  type Definition,
} from "@lmthing/ui/catalog";

const { Address, DeliveryTracker, Hours, MapList, PlaceCard } = components;

it("reads addresses, localized opening hours, rating, price level and courier step", () => {
  const text = (def: Definition, example = 0) => readComponent(def, def.examples[example], "x1").join("\n");
  expect(text(Address)).toContain('"14 Greenhouse Lane"');
  expect(text(Address)).toContain('"Bristol BS1 4DJ"');
  expect(text(Address, 2)).not.toContain("side gate");
  expect(text(Hours)).toContain(`Monday: ${timeOfDayLine("09:00")}–${timeOfDayLine("18:00")}`);
  expect(text(Hours)).toContain('2026-12-24: "Closes at 14:00"');
  expect(text(Hours, 1)).toContain("Monday: Closed");
  expect(text(PlaceCard)).toContain("Rating 4.7 out of 5");
  expect(text(PlaceCard)).toContain("Price level 2 out of 4");
  expect(text(DeliveryTracker)).toContain("On the way");
});

it("keeps newlines and bracketed text inside quoted authored content", () => {
  const text = "Gate\n[other press]";
  const address = readComponent(Address, { lines: [text] }, "a1");
  expect(address).toHaveLength(1);
  expect(address[0]).toContain(JSON.stringify(text));
  const hours = readComponent(Hours, { ...Hours.examples[0], special: [{ date: "2026-12-24", text }] }, "h1");
  expect(hours[0]).toContain(`2026-12-24: ${JSON.stringify(text)}`);
});

it("selects a pin without following the row link or exposing it in list mode", () => {
  const screen = { id: "places", components: [{ id: "m1", c: "MapList", ...MapList.examples[0] }] };
  const defs = { MapList };
  const enabled = readScreen(screen, defs);
  expect(enabled).toContain("[m1/r2/pin select !needs-service]");
  expect(enabled).toContain("[m1/r2 press→greenhouse !needs-service]");
  const selected = planAct(screen, defs, {}, [{ address: "m1/r2/pin", action: "select" }]);
  expect(selected).toMatchObject({ ok: true, links: [], values: { "places/m1/$activePin": 2 } });
  const list = planAct(screen, defs, {}, [{ address: "m1/view", action: "select", value: "list" }]);
  if (!list.ok) throw new Error("List selection was not offered");
  expect(readScreen(screen, defs, list.values)).not.toContain("/pin select");
  expect(readScreen(screen, defs, list.values)).toContain("[m1/r2 press→greenhouse !needs-service]");
  const back = planAct(screen, defs, list.values, [{ address: "m1/view", action: "select", value: "map" }]);
  if (!back.ok) throw new Error("Map selection was not offered");
  expect(readScreen(screen, defs, back.values)).toContain("[m1/r2/pin select !needs-service]");
});

it("reports overflow only from matching service results", () => {
  const input = MapList.examples[1]!;
  const shown = input.places.map(({ name, goto }) => ({ name, goto }));
  const read = (total: number, results = shown) =>
    readComponent(MapList, input, "m1", "filled", {}, "en", {
      place_results: [{ shown: results, total }],
    }).join("\n");
  expect(read(10)).toContain("and 4 more");
  expect(read(6)).not.toContain("more");
  expect(read(10, [...shown].reverse())).not.toContain("more");
});
