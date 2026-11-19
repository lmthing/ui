import { selectedIds } from "../../../../scripts/build";
import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  debtControlLabels,
  placeholderTitle,
  stampItemIds,
  readComponent,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const registry = createRegistry({ packs: ["money"], includeDrafts: true });
const ids = ["AccountCard", "Transactions", "Bills", "Split", "AmountPad", "PriceChart", "Loan", "Payoff"];
const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "record", fields: ["title", "detail"] }],
    items: [{ id: "one", type: "record", sample: true, title: "Fern", detail: "Bathroom" }],
  },
  {
    things: [{ type: "record", fields: ["title", "detail"] }],
    items: Array.from({ length: 8 }, (_, i) => ({
      id: `item_${i}`,
      type: "record",
      sample: true,
      title: "x".repeat(80),
      detail: "y".repeat(80),
    })),
  },
  { things: [], items: [{ id: "one", type: "record", sample: true, name: 42, value: false }] },
];

describe.each(selectedIds(ids))("%s contract", (id) => {
  const def = (components as Record<string, Definition>)[id]!;
  it("accepts examples and empty, matching, oversized and malformed cast fallbacks", () => {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
    for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    expect(JSON.stringify(def.fallback({ cast: casts[0]! }))).toContain(placeholderTitle(0));
    expect(JSON.stringify(def.fallback({ cast: casts[1]! }))).toContain("Fern");
  });
  it("declares full metadata and choose, write, read probes with a core near miss", () => {
    expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(def.meta.realPath).not.toBe("");
    expect(def.meta.weight).toBe(2);
    expect(def.meta.states).toContain("filled");
    const choose = def.probes.filter((probe) => probe.kind === "choose");
    expect(choose.length).toBeGreaterThanOrEqual(2);
    expect(choose.some((probe) => probe.expect === id)).toBe(true);
    const core = createRegistry();
    expect(choose.some((probe) => probe.expect !== id && core.resolve(probe.expect) !== undefined)).toBe(
      true,
    );
    expect(def.probes.some((probe) => probe.kind === "write" && probe.expect === id)).toBe(true);
    for (const probe of choose) {
      expect(registry.ids).toContain(probe.expect);
      expect(probe.need).not.toMatch(new RegExp(`\\b${id}\\b`));
    }
    const reads = def.probes.filter((probe) => probe.kind === "read");
    expect(reads.length).toBeGreaterThanOrEqual(1);
    for (const probe of reads) {
      const instance = probe.expect.address.split("/")[0]!;
      const input = stampItemIds(def.meta, def.props.parse(def.examples[probe.screen]));
      expect(affordancesOf(def.meta, input, instance)).toEqual(
        expect.arrayContaining([expect.objectContaining(probe.expect)]),
      );
    }
  });
});

it("offers optional note and debt edit actions only when enabled", () => {
  for (const id of selectedIds(["Loan", "Payoff"])) {
    const def = (components as Record<string, Definition>)[id]!;
    const input = def.fallback({ cast: casts[0]! }) as Record<string, unknown>;
    for (const goto of [undefined, "terms"]) {
      const parsed = stampItemIds(def.meta, def.props.parse({ ...input, goto }));
      expect(affordancesOf(def.meta, parsed, "d1").some((action) => action.part === "edit")).toBe(
        goto !== undefined,
      );
    }
  }
  for (const note of [false, true]) {
    const def = components.AmountPad;
    const input = def.props.parse({ label: "Amount", note });
    expect(affordancesOf(def.meta, input, "a1").some((action) => action.part === "note")).toBe(note);
  }
  expect(components.Split.meta.partTiers).toEqual({ settle: "people" });
  expect(components.PriceChart.meta.tier).toBe("service");
});

it("reads debt priority choices and the optional terms editor using shared copy", () => {
  const loan = components.Loan;
  expect(readComponent(loan, loan.examples[0], "l1").join("\n")).toContain(debtControlLabels.edit);
  const payoff = components.Payoff;
  const reading = readComponent(payoff, payoff.examples[0], "p1").join("\n");
  for (const key of ["strategy", "high_rate", "small_balance", "extra", "edit"] as const)
    expect(reading).toContain(debtControlLabels[key]);
  expect(loan.meta.read(loan.fallback({ cast: casts[0]! }), "filled")).toEqual([]);
  expect(payoff.meta.read(payoff.examples[0], "loading")).toEqual([]);
});
