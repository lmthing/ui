import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  packOf,
  readComponent,
  stampItemIds,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const { Dividends, Holdings, InvestmentActivity, Performance, Watchlist } = components;
const defs: Definition[] = [Holdings, Watchlist, Performance, Dividends, InvestmentActivity];
const cast: CastLike = { things: [], items: [] };
const full: CastLike = {
  things: [{ type: "instrument", fields: ["name"] }],
  items: [{ id: "ref", type: "instrument", sample: true, name: "A".repeat(80) }],
};
const malformed: CastLike = { ...full, items: [{ ...full.items[0]!, name: 4 }] };

describe("draft contracts", () => {
  it.each(defs)("accepts examples and neutral, populated and malformed cast fallbacks", (def) => {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of def.examples) expect(def.props.safeParse(example).success, def.meta.id).toBe(true);
    for (const input of [cast, full, malformed])
      expect(def.props.safeParse(def.fallback({ cast: input })).success, def.meta.id).toBe(true);
    if (def.meta.status === "draft") expect(def).not.toHaveProperty(def.meta.id);
  });
  it("uses neutral placeholder names and clips cast titles", () => {
    expect(Holdings.fallback({ cast }).positions[0]?.name).toBe("Item one");
    expect(Watchlist.fallback({ cast: full }).items[0]?.name).toBe("A".repeat(32));
    expect(Performance.fallback({ cast: malformed }).title).toBe("Item one");
  });
  it.each(defs)("has core near misses and actionable read probes", (def) => {
    expect(def.meta).toMatchObject({ group: "data", tier: "phone" });
    expect(def.meta.realPath).not.toBe("");
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: def.meta.id }));
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "write", expect: def.meta.id }));
    expect(def.probes.some((probe) => probe.kind === "choose" && !Object.hasOwn(packOf, probe.expect))).toBe(
      true,
    );
    const reads = def.probes.filter((probe) => probe.kind === "read");
    expect(reads.length).toBeGreaterThanOrEqual(1);
    for (const {
      screen,
      expect: { address, action },
    } of reads) {
      const read = readComponent(def, def.examples[screen], address.split("/")[0]!);
      expect(read.join("\n")).toContain(`[${address} ${action}`);
    }
  });
});

describe("investment seed boundaries", () => {
  it("rejects unknown keys and invalid holdings while allowing zero and fractional opening units", () => {
    const input = Holdings.examples[0]!,
      row = input.positions[0]!;
    for (const patch of [
      { assetId: "Invalid ID" },
      { name: "a".repeat(33) },
      { symbol: "a".repeat(13) },
      { units: -1 },
      { price: -1 },
      { class: "cash" },
      { quotedAt: "2026-02-29T00:00:00Z" },
      { quotedAt: "2026-02-01T00:00:00" },
      { gain: 10 },
      { color: "red" },
    ])
      expect(Holdings.props.safeParse({ ...input, positions: [{ ...row, ...patch }] }).success).toBe(false);
    expect(Holdings.props.safeParse({ ...input, positions: Array(7).fill(row) }).success).toBe(false);
    expect(Holdings.props.safeParse({ ...input, positions: [row, row] }).success).toBe(false);
    expect(Holdings.props.safeParse({ ...input, positions: [] }).success).toBe(true);
    expect(
      Holdings.props.safeParse({ ...input, positions: [{ ...row, units: 0.25, price: 0 }] }).success,
    ).toBe(true);
  });
  it("requires positive watch thresholds and defaults direction only when targeted", () => {
    const input = Watchlist.examples[0]!,
      row = input.items[0]!;
    for (const patch of [
      { direction: "at_or_above" },
      { target: 0 },
      { direction: "up", target: 50 },
      { gap: 5 },
    ])
      expect(Watchlist.props.safeParse({ items: [{ ...row, ...patch }] }).success).toBe(false);
    expect(Watchlist.props.safeParse({ items: [] }).success).toBe(false);
    expect(Watchlist.props.parse(input).items[0]?.direction).toBeUndefined();
    expect(Watchlist.props.parse({ items: [{ ...row, target: 50 }] }).items[0]?.direction).toBe(
      "at_or_below",
    );
  });
  it("requires ordered, unique quote observations and permits missing quotes", () => {
    const input = Performance.examples[0]!,
      [first, last] = input.samples;
    for (const samples of [
      [last],
      [last, first],
      [first, { ...last, at: "2026-01-01T01:00:00+01:00" }],
      [first, { ...last, quotes: [...last!.quotes, ...last!.quotes] }],
      [first, { ...last, contributed: 1000 }],
      Array(61).fill(first),
    ])
      expect(Performance.props.safeParse({ ...input, samples }).success).toBe(false);
    expect(Performance.props.parse(input).samples[0]?.quotes).toEqual([]);
  });
});

describe("investment cash record boundaries", () => {
  it("rejects dividend seed totals and contradictory receipt dates", () => {
    const input = Dividends.examples[0]!,
      row = input.distributions[0]!;
    for (const patch of [
      { perUnit: 0 },
      { withheld: -1 },
      { gross: 10 },
      { payOn: "2026-02-30" },
      { receivedAt: "2026-03-09T12:00:00Z" },
    ])
      expect(Dividends.props.safeParse({ ...input, distributions: [{ ...row, ...patch }] }).success).toBe(
        false,
      );
    expect(Dividends.props.safeParse({ ...input, distributions: [row, row] }).success).toBe(false);
  });
  it("validates trade and cash shapes without accepting seeded dividend receipts", () => {
    const input = InvestmentActivity.examples[0]!,
      [deposit, buy] = input.entries;
    for (const entries of [
      [{ ...deposit, at: "2025-12-31T23:59:00Z" }],
      [{ ...deposit, amount: 0 }],
      [{ ...deposit, fee: 0 }],
      [{ ...deposit, kind: "dividend" }],
      [{ ...buy, amount: 800 }],
      [{ ...buy, units: undefined }],
      [{ ...buy, fee: -1 }],
      [buy, buy],
      Array(21).fill(buy),
    ])
      expect(InvestmentActivity.props.safeParse({ ...input, entries }).success).toBe(false);
    expect(InvestmentActivity.props.parse({ ...input, openingContributed: -5 }).entries[1]?.fee).toBe(0);
  });
});

describe("invest affordances", () => {
  it("keeps the quote timestamp in the full read and out of the brief read", () => {
    const input = Holdings.examples[0]!;
    const timestamp = input.positions[0]!.quotedAt;
    expect(readComponent(Holdings, input, "h1").join("\n")).toContain(timestamp);
    expect(readComponent(Holdings, { ...input, detail: "brief" }, "h1").join("\n")).not.toContain(timestamp);
  });
  it("keeps hidden positions and offline refresh out of the read surface", () => {
    const input = Holdings.examples[0]!;
    const decoded = Holdings.props.parse(input);
    expect(decoded.positions).toHaveLength(2);
    const parsed = stampItemIds(Holdings.meta, decoded);
    expect(affordancesOf(Holdings.meta, parsed, "h1").map(({ address }) => address)).toEqual(["h1/r1"]);
    expect(
      affordancesOf(Holdings.meta, { ...parsed, quote_service: true }, "h1").map(({ address }) => address),
    ).toEqual(["h1/refresh", "h1/r1"]);
  });
  it("keeps reversals distinct from navigation and retains record ids after address stamping", () => {
    const received = Dividends.examples[1]!;
    const parsed = stampItemIds(Dividends.meta, Dividends.props.parse(received));
    expect(parsed.distributions[0]).toMatchObject({ id: "r1", record_id: "feb_distribution" });
    expect(affordancesOf(Dividends.meta, parsed, "d1").map(({ address }) => address)).toEqual(["d1/r1/void"]);
    const read = readComponent(InvestmentActivity, InvestmentActivity.examples[1], "i1").join("\n");
    expect(read).toContain("[i1/r2/void press]");
    expect(read).not.toContain("[i1/r1/void");
  });
});

describe("offset timestamps", () => {
  const earlier = "2026-01-01T00:00:00.0001Z";
  const later = "2026-01-01T01:00:00.0002+01:00";
  it("accepts distinct ordered sub-millisecond samples", () => {
    const input = Performance.examples[0]!;
    const samples = [
      { at: earlier, quotes: [] },
      { at: later, quotes: [] },
    ];
    expect(Performance.props.safeParse({ ...input, samples }).success).toBe(true);
    expect(Performance.props.safeParse({ ...input, samples: [...samples].reverse() }).success).toBe(false);
  });
  it("rejects an event fractionally before its opening statement", () => {
    const input = InvestmentActivity.examples[0]!;
    const entries = [{ ...input.entries[0]!, at: earlier }];
    expect(InvestmentActivity.props.safeParse({ ...input, since: later, entries }).success).toBe(false);
  });
  it("reads entitlement, payment and event dates on the corresponding rows", () => {
    const dividend = Dividends.examples[0]!;
    const { entitledAt, payOn } = dividend.distributions[0]!;
    const distribution = readComponent(Dividends, dividend, "d1").find((line) => line.startsWith("  r1"));
    expect(distribution).toContain(entitledAt);
    expect(distribution).toContain(payOn);
    const activity = InvestmentActivity.examples[0]!;
    const event = readComponent(InvestmentActivity, activity, "i1").find((line) => line.startsWith("  r2"));
    expect(event).toContain(activity.entries[1]!.at);
  });
});
