import { describe, expect, it } from "vitest";
import {
  components,
  packOf,
  affordancesOf,
  stampItemIds,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const defs = Object.values(components).filter(
  (def) => packOf[def.meta.id as keyof typeof packOf] === "health",
) as Definition[];
const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "record", fields: ["title", "detail"] }],
    items: [{ id: "r1", type: "record", sample: true, title: "Morning", detail: "Today" }],
  },
  {
    things: [{ type: "record", fields: ["title"] }],
    items: [{ id: "r1", type: "record", sample: true, title: 12 }],
  },
  {
    things: [{ type: "record", fields: ["title"] }],
    items: [{ id: "r1", type: "record", sample: false, title: "x".repeat(200) }],
  },
];

describe.each(defs)("$meta.id contract", (def) => {
  it("parses every domain example and empty, useful, malformed and long casts", () => {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const input of [...def.examples, ...casts.map((cast) => def.fallback({ cast }))])
      expect(def.props.safeParse(input).success).toBe(true);
    expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(def.meta.tier).toBe("phone");
    expect(def.meta.realPath).not.toBe("");
    if (def.meta.status === "draft") expect(def).not.toHaveProperty(def.meta.id);
  });
  it("has a positive choice, a core near miss, a write and every required read target", () => {
    expect(def.probes.some((probe) => probe.kind === "choose" && probe.expect === def.meta.id)).toBe(true);
    expect(
      def.probes.some(
        (probe) =>
          probe.kind === "choose" &&
          probe.expect !== def.meta.id &&
          !(probe.expect in packOf) &&
          def.meta.pick.includes(probe.expect),
      ),
    ).toBe(true);
    expect(def.probes.some((probe) => probe.kind === "write" && probe.expect === def.meta.id)).toBe(true);
    const reads = def.probes.filter((probe) => probe.kind === "read");
    if (def.meta.actions) expect(reads.length).toBeGreaterThanOrEqual(1);
    for (const probe of reads) {
      const instance = probe.expect.address.split("/")[0]!;
      const parsed = stampItemIds(def.meta, def.props.parse(def.examples[probe.screen]));
      expect(affordancesOf(def.meta, parsed, instance)).toEqual(
        expect.arrayContaining([expect.objectContaining(probe.expect)]),
      );
    }
  });
});

it("uses shared neutral placeholders, not domain names, for an empty cast", () => {
  const cast = casts[0]!;
  expect(components.Workout.fallback({ cast }).exercises[0]!.name).toBe("Item one");
  expect(components.Exercise.fallback({ cast }).name).toBe("Item one");
  expect(components.Measurements.fallback({ cast }).label).toBe("Item one");
  expect(components.Medication.fallback({ cast }).doses[0]!.dose).toBe("Details");
  expect(components.HabitGrid.fallback({ cast }).habits[0]!.name).toBe("Item one");
  expect(components.Vitals.fallback({ cast }).readings[0]!.at).toBe("Details");
  expect(components.SymptomLog.fallback({ cast }).groups[0]!.label).toBe("Item one");
  expect(components.ActivityRings.fallback({ cast }).rings[0]!.unit).toBe("0");
});
