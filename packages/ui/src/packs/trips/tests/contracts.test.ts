import { expect, it } from "vitest";
import {
  components,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const ids = [
  "Itinerary",
  "Reservation",
  "PackingList",
  "Weather",
  "TravelDocs",
  "Converter",
  "Clocks",
] as const;
const misses = ["Timeline", "KeyValue", "Checklist", "Stats", "KeyValue", "Amount", "Timer"];
const empty: CastLike = { things: [], items: [] };
const casts: CastLike[] = [
  empty,
  {
    things: [{ type: "place", fields: ["name", "detail"] }],
    items: [{ id: "place_one", type: "place", sample: true, name: "Edinburgh", detail: "Scotland" }],
  },
  { things: [], items: [{ id: "Bad ID", type: "place", sample: true, name: 4 }] },
];

it.each(ids)("validates %s examples, neutral/malformed/relevant fallbacks and probe shapes", (id) => {
  const def: Definition = components[id];
  expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
  expect(def.meta.realPath).not.toBe("");
  expect(def.meta.variants?.density).toEqual(["comfortable", "compact"]);
  for (const part of [...(def.meta.parts ?? []), ...(def.meta.items?.parts ?? [])])
    expect(part).toMatch(/^[a-z][a-z0-9_]*$/);
  expect(def.examples.length).toBeGreaterThanOrEqual(2);
  for (const example of def.examples) {
    expect(def.props.safeParse(example).success).toBe(true);
    expect(def.props.safeParse({ ...(example as object), colour: "red" }).success).toBe(false);
  }
  for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
  expect(def.probes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "choose", expect: id }),
      expect.objectContaining({ kind: "choose", expect: misses[ids.indexOf(id)] }),
      expect.objectContaining({ kind: "write", expect: id }),
    ]),
  );
  if (def.meta.actions) expect(def.probes.some(({ kind }) => kind === "read")).toBe(true);
  if (def.meta.status === "draft") expect(def).not.toHaveProperty(id);
});

it("uses neutral labels without a cast and cast labels when present", () => {
  const { Itinerary, Reservation, PackingList, Weather, TravelDocs, Clocks } = components;
  expect(Itinerary.fallback({ cast: empty }).days[0]?.stops[0]?.title).toBe(placeholderTitle(0));
  expect(Reservation.fallback({ cast: empty }).title).toBe(placeholderTitle(0));
  expect(PackingList.fallback({ cast: empty }).groups[0]?.items[0]?.name).toBe(placeholderTitle(0));
  expect(Weather.fallback({ cast: empty }).place).toBe(placeholderTitle(0));
  expect(TravelDocs.fallback({ cast: empty }).docs[0]?.who).toBe(placeholderTitle(0));
  expect(Clocks.fallback({ cast: empty }).places[1]?.label).toBe(placeholderTitle(1));
  expect(Itinerary.fallback({ cast: casts[1]! }).days[0]?.stops[0]?.title).toBe("Edinburgh");
  expect(Weather.fallback({ cast: casts[1]! }).place).toBe("Edinburgh");
});

it("rejects invalid nested fields, bounds, dates and service-computed input", () => {
  const { Itinerary, Reservation, PackingList, Weather, TravelDocs, Converter, Clocks } = components;
  const day = Itinerary.examples[0]!.days[0]!;
  const stop = day.stops[0]!;
  const group = PackingList.examples[0]!.groups[0]!;
  const item = group.items[0]!;
  const doc = TravelDocs.examples[0]!.docs[0]!;
  const place = Clocks.examples[0]!.places[0]!;
  const badInputs: [Definition, unknown[]][] = [
    [
      Itinerary,
      [
        { days: [] },
        { days: Array(7).fill(day) },
        { days: [{ ...day, stops: Array(15).fill(stop) }] },
        { days: [{ ...day, stops: [{ ...stop, minutes: 2 }] }] },
        { days: [{ ...day, stops: [{ ...stop, time: "25:00", goto: "Bad ID" }] }] },
      ],
    ],
    [
      Reservation,
      [
        { ...Reservation.examples[0], ref: "R".repeat(13) },
        { ...Reservation.examples[0], start: { date: "2027-02-29", time: "09:00" } },
      ],
    ],
    [
      PackingList,
      [
        { groups: [] },
        { groups: Array(7).fill(group) },
        { groups: [{ ...group, items: Array(11).fill(item) }] },
        { groups: [{ ...group, items: [{ ...item, qty: 0 }] }] },
        { ...PackingList.examples[0], progress: 70 },
      ],
    ],
    [
      Weather,
      [
        { place: "Tokyo", from: "2027-06-01", to: "2027-05-01" },
        { place: "Tokyo", high: 25 },
      ],
    ],
    [TravelDocs, [{ docs: [{ ...doc, number: "x".repeat(17) }] }, { docs: [{ ...doc, warning: true }] }]],
    [Converter, [{ value: -1 }, { value: Infinity }, { value: 2, rate: 150 }]],
    [
      Clocks,
      [
        { places: [place] },
        { places: Array(5).fill(place) },
        { places: [place, { ...place, zone: "Mars/Base" }] },
      ],
    ],
  ];
  for (const [def, inputs] of badInputs)
    for (const input of inputs) expect(def.props.safeParse(input).success, def.meta.id).toBe(false);
});

it("reads nested available parts and masks travel document numbers", () => {
  const itinerary = readComponent(components.Itinerary, components.Itinerary.examples[0], "i1").join("\n");
  expect(itinerary).toContain("[i1/r1 toggle]");
  expect(itinerary).toContain("[i1/r1/stop_1 press→garden]");
  expect(itinerary).not.toContain("stop_3");
  const packing = readComponent(components.PackingList, components.PackingList.examples[0], "p1").join("\n");
  expect(packing).toContain("[p1/r1/packed_1 check:done]");
  expect(packing).toContain("[p1/r1/packed_2 check:todo]");
  expect(packing).not.toContain("packed_3");
  const docs = readComponent(components.TravelDocs, components.TravelDocs.examples[0], "t1").join("\n");
  expect(docs).toContain("(secret)");
  expect(docs).not.toContain("DEMO-");
});
