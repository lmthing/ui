import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  packOf,
  placeholderDetail,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const ids = ["PlaceCard", "Address", "Hours", "DeliveryTracker", "MapList", "Departures"] as const;
const empty = { things: [], items: [] };
const matching = {
  things: [{ type: "venue", fields: ["name", "note"] }],
  items: [{ id: "example", type: "venue", sample: true, name: "Riverside", note: "North entrance" }],
};
const malformed = { things: [], items: [{ id: "Bad ID", type: "venue", sample: false, name: 7 }] };
const casts: CastLike[] = [empty, matching, malformed];
const definitions: Record<string, Definition> = components;
const row = { name: "Riverside", meta: "North", goto: "riverside" };
const departure = { line: "24", to: "Nursery Gate" };

describe.each(ids)("%s contract", (id) => {
  const def = definitions[id]!;
  it("accepts its examples and usable fallbacks, and rejects extra Writer fields", () => {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const input of def.examples) {
      expect(def.props.safeParse(input).success).toBe(true);
      expect(def.props.safeParse({ ...(input as object), color: "red" }).success).toBe(false);
    }
    for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    if (def.meta.status === "draft") expect(components[id]).not.toHaveProperty(id);
  });

  it("has bounded meta, valid parts and the required probe shapes", () => {
    expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(def.meta.realPath).not.toBe("");
    for (const part of [...(def.meta.parts ?? []), ...(def.meta.items?.parts ?? [])])
      expect(part).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: id }));
    expect(
      def.probes.some(({ kind, expect }) => kind === "choose" && expect !== id && !(expect in packOf)),
    ).toBe(true);
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "write", expect: id }));
    if (def.meta.actions) expect(def.probes.some(({ kind }) => kind === "read")).toBe(true);
    for (const probe of def.probes) {
      if (probe.kind !== "read") continue;
      const [instance] = probe.expect.address.split("/");
      const lines = readComponent(def, def.examples[probe.screen], instance!);
      expect(lines.join("\n")).toContain(`[${probe.expect.address} ${probe.expect.action}`);
    }
  });
});

it("uses shared empty-cast placeholders and grows text from matching cast data", () => {
  expect(components.PlaceCard.fallback({ cast: empty }).name).toBe(placeholderTitle(0));
  expect(components.Address.fallback({ cast: empty }).lines).toEqual([placeholderDetail]);
  expect(components.PlaceCard.fallback({ cast: matching })).toMatchObject({ name: "Riverside" });
  expect(components.Address.fallback({ cast: matching }).lines).toEqual(["North entrance"]);
  expect(components.MapList.fallback({ cast: matching }).places[0]).toEqual({
    name: "Riverside",
    meta: "North entrance",
    goto: "example",
  });
  expect(components.Hours.fallback({ cast: empty }).days.every(({ closed }) => closed)).toBe(true);
});

it("offers only applicable actions and never accepts authored live data", () => {
  const address = components.Address;
  const noPhone = address.props.parse({ lines: ["8 Linden Road"] });
  expect(affordancesOf(address.meta, noPhone, "a1").map(({ part }) => part)).toEqual(["copy", "directions"]);
  expect(address.meta.partTiers).toEqual({ call: "service", directions: "service" });
  const delivery = components.DeliveryTracker;
  const delivered = delivery.props.parse({ step: "delivered", courier: "Nia" });
  expect(affordancesOf(delivery.meta, delivered, "d1")).toEqual([]);
});

it("enforces venue and address limits", () => {
  const base = { name: "a".repeat(32), category: "a".repeat(20), goto: "details" };
  const place = components.PlaceCard.props;
  const address = components.Address.props;
  expect(place.safeParse({ ...base, rating: 5, priceLevel: 4 }).success).toBe(true);
  for (const input of [
    { name: "a".repeat(33) },
    { category: "a".repeat(21) },
    { rating: 5.1 },
    { priceLevel: 0 },
    { priceLevel: 2.5 },
    { opens: "25:00", closes: "08:00" },
    { goto: "Bad ID" },
    { distance: 5 },
    { open_state: "open" },
  ])
    expect(place.safeParse({ ...base, ...input }).success).toBe(false);
  expect(
    address.safeParse({ lines: ["a".repeat(40), "B", "C"], phone: "1".repeat(20), note: "a".repeat(80) })
      .success,
  ).toBe(true);
  for (const input of [
    { lines: [] },
    { lines: ["A", "B", "C", "D"] },
    { lines: ["a".repeat(41)] },
    { lines: ["A"], phone: "1".repeat(21) },
    { lines: ["A"], note: "a".repeat(81) },
  ])
    expect(address.safeParse(input).success).toBe(false);
});

it("requires a seven-day week, real times, and at most three real special dates", () => {
  const hours = components.Hours;
  const { days, special } = hours.examples[0]!;
  expect(hours.props.safeParse({ days, special: [] }).success).toBe(true);
  expect(hours.props.safeParse({ days, special: Array(3).fill(special[0]) }).success).toBe(true);
  const sundayFirst = [{ ...days[6]!, closed: true }, ...days.slice(0, 6)];
  expect(hours.props.parse({ days: sundayFirst, special }).days).toEqual([
    ...days.slice(0, 6),
    { day: "sun", closed: true, from: "00:00", to: "00:00" },
  ]);
  for (const input of [
    { days: days.slice(0, 6) },
    { days: [...days, days[0]] },
    { days: Array(7).fill(days[0]) },
    { days: [{ ...days[0], from: "12:60" }, ...days.slice(1)] },
    { special: Array(4).fill(special[0]) },
    { special: [{ date: "2026-02-30", text: "Closed" }] },
    { special: [{ date: "2026-12-25", text: "a".repeat(25) }] },
  ])
    expect(hours.props.safeParse({ days, special, ...input }).success).toBe(false);
});

it("bounds delivery, place rows and departures and rejects extra service fields", () => {
  const delivery = components.DeliveryTracker.props;
  const map = components.MapList.props;
  const transit = components.Departures.props;
  for (const input of [
    { step: "lost" },
    { step: "nearby", courier: "a".repeat(21) },
    { step: "nearby", eta: 2 },
    { step: "nearby", photo: "https://example.com/courier.png" },
  ])
    expect(delivery.safeParse(input).success).toBe(false);
  expect(map.safeParse({ places: Array(6).fill(row) }).success).toBe(true);
  for (const places of [
    [],
    Array(7).fill(row),
    [{ ...row, name: "a".repeat(29) }],
    [{ ...row, meta: "a".repeat(33) }],
    [{ ...row, goto: "Bad ID" }],
    [{ ...row, distance: 2 }],
    [{ ...row, pin: {} }],
  ])
    expect(map.safeParse({ places }).success).toBe(false);
  expect(map.safeParse({ places: [row], view: "list" }).success).toBe(false);
  expect(map.safeParse({ places: [row], total: 10 }).success).toBe(false);
  expect(transit.safeParse({ stop: "a".repeat(32), rows: Array(6).fill(departure) }).success).toBe(true);
  for (const rows of [
    [],
    Array(7).fill(departure),
    [{ ...departure, line: "a".repeat(7) }],
    [{ ...departure, to: "a".repeat(29) }],
    [{ ...departure, delay: 2 }],
  ])
    expect(transit.safeParse({ stop: "Nursery", rows }).success).toBe(false);
  expect(transit.safeParse({ stop: "a".repeat(33), rows: [departure] }).success).toBe(false);
});
