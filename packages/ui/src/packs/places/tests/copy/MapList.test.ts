import { expect, it } from "vitest";
import { mapListCopy, mapListReading } from "../../copy";

const places = [
  { name: "Alder Park", goto: "alder" },
  { name: "Juniper Café", goto: "juniper" },
];
const position = { x: 0.2, y: 0.4 };
const views = ["With map", "Just the list"];
const shown = [
  { ...places[0], distanceKm: 1.25, position },
  { ...places[1], distanceKm: 0 },
];

it("formats matching service distances and overflow in the requested locale", () => {
  const service = { place_results: [{ shown, total: 5 }] };
  expect(mapListCopy(places, service, "de").places[0]).toMatchObject({ position, distance: "1,25 km" });
  expect(mapListReading(places, service, "de")).toEqual([
    ...views,
    '"Alder Park": 1,25 km',
    '"Juniper Café": 0 km',
    "and 3 more",
  ]);
});

it("ignores unrelated results, and ignores invalid fields without discarding valid ones", () => {
  const invalid = { ...shown[0], distanceKm: -1, position: { x: 1.5, y: 0 } };
  const service = { place_results: [{ shown: [invalid, shown[1]], total: 1 }] };
  expect(mapListReading(places, service)).toEqual([...views, '"Juniper Café": 0 km']);
  expect(mapListCopy(places, service).places[0]?.position).toEqual(mapListCopy(places).places[0]?.position);
  expect(mapListReading(places, { place_results: [{ shown: [...shown].reverse(), total: 8 }] })).toEqual(
    views,
  );
  expect(mapListReading([{ ...places[0]!, goto: "elsewhere" }, places[1]!], service)).toEqual(views);
});
