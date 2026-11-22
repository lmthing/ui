import { expect, it, vi } from "vitest";
import { components, createRegistry, packOf, readComponent, type CastLike } from "@lmthing/ui/catalog";

const { Units, RentRoll, Viewings, Inspections, Meters } = components;
const defs = [Units, RentRoll, Viewings, Inspections, Meters];
const empty: CastLike = { things: [], items: [] };
const cast: CastLike = {
  things: [{ type: "record", fields: ["display", "description"] }],
  items: [
    { id: "one", type: "record", sample: true, display: "Example title", description: "Example detail" },
  ],
};
const malformed: CastLike = {
  ...cast,
  items: [{ id: "one", type: "record", sample: true, display: 45, description: "  " }],
};

it.each(defs)("validates example and fallback inputs for $meta.id and has all probe types", (def) => {
  expect(def.examples.length).toBeGreaterThanOrEqual(2);
  for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
  for (const source of [empty, cast, malformed])
    expect(def.props.safeParse(def.fallback({ cast: source })).success).toBe(true);
  expect(JSON.stringify(def.fallback({ cast: empty }))).toContain("Item one");
  expect(JSON.stringify(def.fallback({ cast }))).toContain("Example title");
  expect(def.probes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "choose", expect: def.meta.id }),
      expect.objectContaining({ kind: "write", expect: def.meta.id }),
      expect.objectContaining({ kind: "read" }),
    ]),
  );
  expect(
    def.probes.some(
      (probe) =>
        probe.kind === "choose" &&
        probe.expect !== def.meta.id &&
        createRegistry().ids.some((id) => id === probe.expect),
    ),
  ).toBe(true);
  expect(packOf[def.meta.id]).toBe("property");
  expect(def.meta.tier).toBe("phone");
  expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
  const parts = [...def.meta.parts, ...def.meta.items.parts];
  expect(parts.every((part) => /^[a-z]+(?:_[a-z]+)*$/.test(part))).toBe(true);
  expect(def.props.safeParse({ ...def.examples[0], pixels: 20 }).success).toBe(false);
});

it("uses half-open let dates, ignores cancelled lets and only opens linked unit rows", () => {
  const [unit] = Units.examples[1]!.units;
  const [first, next] = Units.examples[1]!.lets;
  const input = { units: [unit!], lets: [first!, { ...next!, cancelled: false }], on: "2026-11-21" };
  expect(readComponent(Units, input, "u1").join("\n")).toContain("Occupied · Ivy");
  expect(readComponent(Units, { ...input, lets: [first!, next!] }, "u1").join("\n")).toContain("Vacant");
  expect(
    Units.props.safeParse({ ...input, lets: [first!, { ...next!, start: "2026-11-20", cancelled: false }] })
      .success,
  ).toBe(false);
  expect(Units.props.safeParse({ ...input, lets: [{ ...first!, unitRef: "unknown" }] }).success).toBe(false);
  expect(readComponent(Units, Units.examples[0], "u1").join("\n")).toContain(
    "[u1/r1 press→property_unit_detail]",
  );
  expect(readComponent(Units, Units.examples[0], "u1").join("\n")).not.toContain("[u1/r2 press");
});

it("reconciles allocations, excludes voids, and only confirms the destructive action", () => {
  const paid = readComponent(RentRoll, RentRoll.examples[0], "r1").join("\n");
  expect(paid).toContain("assessed $900 · received $600 · outstanding $300");
  expect(paid).toContain("[r1/r1/remind press !needs-service]");
  expect(paid).toContain("[r1/r2/void press]");
  const voided = readComponent(RentRoll, RentRoll.examples[1], "r1").join("\n");
  expect(voided).toContain("received $0");
  expect(voided).not.toContain("/void press");
  expect(RentRoll.meta.confirmParts).toEqual(["void"]);
});

it("keeps past outcomes separate from invitations and disables cancelled viewing controls", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
    const upcoming = readComponent(Viewings, Viewings.examples[0], "v1").join("\n");
    expect(upcoming).toContain("[v1/r1/invite send !needs-service]");
    expect(upcoming).not.toContain("/outcome select");
    const past = readComponent(Viewings, Viewings.examples[1], "v1").join("\n");
    expect(past).toContain("[v1/r1/outcome select");
    expect(past).not.toContain("/outcome select→");
    expect(past).not.toContain("/invite send");
    const cancelled = { viewings: [{ ...Viewings.examples[0]!.viewings[0], status: "cancelled" }] };
    expect(readComponent(Viewings, cancelled, "v1").join("\n")).not.toMatch(/\[v1\/r1\//);
    expect(Viewings.meta.confirmParts).toEqual(["cancel"]);
    const example = Viewings.examples[0]!.viewings[0]!;
    for (const status of ["attended", "no_show"])
      expect(Viewings.props.safeParse({ viewings: [{ ...example, status }] }).success).toBe(false);
    vi.setSystemTime(new Date(example.start));
    const started = readComponent(Viewings, Viewings.examples[0], "v1").join("\n");
    expect(started).toContain("/outcome select");
    expect(started).not.toContain("/invite send");
  } finally {
    vi.useRealTimers();
  }
});

it("reads viewings in instant order with computed ends and retains the original addresses", () => {
  const example = Viewings.examples[1]!.viewings[0]!;
  const viewings = [
    { ...example, start: "2026-10-17T12:00:00-02:00" },
    { ...example, viewingRef: "willow_view", unit: "Willow Flat", start: "2026-10-17T14:00:00+02:00" },
  ];
  const reading = readComponent(Viewings, { viewings }, "v1").join("\n");
  expect(reading.indexOf("r2 · Willow Flat")).toBeLessThan(reading.indexOf("r1 · North Cabin"));
  expect(reading).toContain("2026-10-17T12:30:00.000Z");
  expect(reading).toContain("[v1/r2/outcome select]");
});

it("requires complete inspection conditions and makes finalised evidence non-editable", () => {
  const draft = readComponent(Inspections, Inspections.examples[0], "i1").join("\n");
  expect(draft).toContain("[i1/finalise press]");
  expect(draft).toContain("[i1/r2/photo press !needs-ok]");
  expect(draft).toContain("[i1/r2/remove_photo press]");
  const locked = readComponent(Inspections, { ...Inspections.examples[1], style: "rooms" }, "i1").join("\n");
  expect(locked).not.toMatch(/\/(condition|note|photo|remove_photo|finalise) (select|type|press)/);
  expect(
    Inspections.props.safeParse({
      ...Inspections.fallback({ cast: empty }),
      finalisedAt: "2026-11-18T10:00:00Z",
    }).success,
  ).toBe(false);
  expect(Inspections.meta.confirmParts).toEqual(["remove_photo", "finalise"]);
});

it("keeps precisely paid charges settled and isolates future charges", () => {
  const sample = RentRoll.examples[0]!;
  const settled = { ...sample.charges[0]!, amount: 0.8 };
  const receipt = sample.receipts[0]!;
  const input = {
    ...sample,
    charges: [settled, { ...settled, chargeRef: "future", due: "2026-12-01" }],
    receipts: [
      { ...receipt, amount: 0.7 },
      { ...receipt, receiptRef: "second", amount: 0.1 },
    ],
  };
  const ledger = readComponent(RentRoll, input, "r1").join("\n");
  expect(ledger).toContain("received $0.80 · outstanding $0");
  expect(ledger).toContain("[r1/r1/record press→property_rent_receipt]");
  expect(ledger).not.toContain("[r1/r2/");
  expect(ledger).not.toContain("/remind press");
  const outstanding = readComponent(RentRoll, { ...input, style: "outstanding" }, "r1").join("\n");
  expect(outstanding).not.toContain("/record press");
  expect(
    RentRoll.props.safeParse({ ...input, receipts: [{ ...receipt, chargeRef: "missing" }] }).success,
  ).toBe(false);
});

it("reads localized history and offers evidence only on the selected meter without renumbering", () => {
  const current = Meters.examples[0]!;
  const second = Meters.examples[1]!;
  const input = {
    ...current,
    style: "history",
    meters: [...current.meters, ...second.meters],
    readings: [
      ...current.readings.map((reading, index) => (index === 1 ? { ...reading, photo: "local:1" } : reading)),
      ...second.readings,
    ],
  };
  const initial = readComponent(Meters, input, "m1").join("\n");
  expect(initial).toContain("r6 · 18 Nov 2026 · 08:00");
  expect(initial.match(/\[[^\]]+\/photo press\]/g)).toEqual(["[m1/r6/photo press]"]);
  const selected = readComponent(Meters, input, "m1", "filled", { "m1/$meterRef": "cabin_water" }).join("\n");
  for (const part of ["r1 [m1/r1 select]", "r3 [m1/r3 select]"]) {
    expect(initial).toContain(part);
    expect(selected).toContain(part);
  }
  expect(selected).toContain("r9 · 17 Nov 2026 · 10:00");
  expect(selected).not.toContain("18 Nov 2026 · 08:00");
  expect(selected.match(/\[[^\]]+\/photo press\]/g)).toEqual(["[m1/r9/photo press]"]);
});

it("validates meter chronology, handles unsorted input and never invents use for one reading", () => {
  const [first, latest] = Meters.examples[0]!.readings;
  const input = { ...Meters.examples[0], readings: [latest!, first!] };
  expect(readComponent(Meters, input, "m1").join("\n")).toContain("46\u00a0kWh used · 31 days");
  const single = readComponent(Meters, { ...input, readings: [latest!] }, "m1").join("\n");
  expect(single).toContain("Latest · 1246\u00a0kWh");
  expect(single).not.toContain("used");
  expect(Meters.props.safeParse({ ...input, readings: [first!, { ...latest!, value: 1199 }] }).success).toBe(
    false,
  );
  expect(
    Meters.props.safeParse({ ...input, readings: [first!, { ...latest!, at: "2026-10-18T09:00:00+01:00" }] })
      .success,
  ).toBe(false);
  expect(
    Meters.props.safeParse({ ...input, readings: [first!, { ...latest!, at: "2099-11-18T08:00:00Z" }] })
      .success,
  ).toBe(false);
});
