import { describe, expect, it } from "vitest";
import { exclusiveLets, unitReading, unitSnapshot } from "../../copy";

const first = {
  unitRef: "north",
  occupant: "Lee",
  start: "2026-11-19",
  end: "2026-11-21",
  rent: 85,
  per: "night",
  cancelled: false,
} as const;
const next = { ...first, occupant: "Ivy", start: first.end, end: "2026-11-23", rent: 0 };
const unit = { unitRef: "north", title: "North Cabin", askingRent: 70, askingPer: "night" } as const;

describe("Units snapshot", () => {
  it("reserves a future let without disclosing the future occupant or treating future rent as current", () => {
    expect(unitSnapshot(unit, [first], "2026-11-18")).toEqual({
      status: "reserved",
      occupant: undefined,
      rent: "$70 / night",
    });
  });
  it("switches occupant at the exclusive end and preserves agreed zero rent", () => {
    expect(unitSnapshot(unit, [first, next], first.start)).toEqual({
      status: "occupied",
      occupant: "Lee",
      rent: "$85 / night",
    });
    expect(unitSnapshot(unit, [next, first], first.end)).toEqual({
      status: "occupied",
      occupant: "Ivy",
      rent: "$0 / night",
    });
  });
  it("ignores cancelled lets, other units, and expired records", () => {
    expect(
      unitSnapshot(
        { unitRef: unit.unitRef, title: unit.title },
        [first, { ...next, cancelled: true }, { ...next, unitRef: "south" }],
        first.end,
      ),
    ).toEqual({ status: "vacant", occupant: undefined, rent: undefined });
  });
  it("detects overlap independent of record order, except for cancelled or unrelated records", () => {
    const overlap = { ...next, start: "2026-11-20" };
    expect(exclusiveLets([next, first])).toBe(true);
    expect(exclusiveLets([overlap, first])).toBe(false);
    expect(exclusiveLets([first, { ...overlap, cancelled: true }])).toBe(true);
    expect(exclusiveLets([first, { ...overlap, unitRef: "south" }])).toBe(true);
    expect(exclusiveLets([{ ...first, end: undefined }, next])).toBe(false);
  });
  it("localizes dates and money while preserving the item address", () => {
    const reading = unitReading(
      { on: first.start, units: [unit], lets: [{ ...first, rent: 1234 }] },
      "de-DE",
      "EUR",
    );
    expect(reading[0]).toContain("19. Nov. 2026");
    expect(reading[1]).toMatch(/^r1 · North Cabin · occupied · Lee · 1\.234/);
    expect(reading[1]).toContain("€");
  });
});
