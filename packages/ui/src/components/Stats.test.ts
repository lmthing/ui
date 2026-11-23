import { describe, expect, expectTypeOf, it } from "vitest";
import { renderInstance } from "../../test/render";
import {
  affordancesOf,
  components,
  createRegistry,
  lineCodes,
  migrateLine,
  readComponent,
  repairComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.Stats;
const tile = { label: "Count", value: "12" };
const tiles = [tile, tile];

describe("Stats schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ tiles: [{ label: " Count ", value: " 12 ", unit: " EUR " }, tile] })).toEqual({
      arrange: "grid",
      tiles: [{ label: "Count", value: "12", unit: "EUR" }, tile],
    });
  });
  it.each([
    {},
    { tiles: Array.from({ length: 5 }, () => tile) },
    { tiles: [{ ...tile, label: "" }, tile] },
    { tiles: [{ ...tile, label: " ".repeat(4) }, tile] },
    { tiles: [{ ...tile, label: "a".repeat(21) }, tile] },
    { tiles: [{ ...tile, value: "" }, tile] },
    { tiles: [{ ...tile, value: "—" }, tile] },
    { tiles: [{ ...tile, value: "N/A" }, tile] },
    { tiles: [{ ...tile, value: "Not in" }, tile] },
    { tiles: [{ label: " ITEM  ONE ", value: "0" }, tile] },
    { tiles: [{ ...tile, value: " ".repeat(4) }, tile] },
    { tiles: [{ ...tile, value: "a".repeat(9) }, tile] },
    { tiles: [{ ...tile, value: 12 }, tile] },
    { tiles: [{ ...tile, unit: "" }, tile] },
    { tiles: [{ ...tile, unit: "a".repeat(9) }, tile] },
    { tiles: [{ ...tile, unit: "this week" }, tile] },
    { tiles: [{ ...tile, trend: "rising" }, tile] },
    { tiles: [{ ...tile, pixels: 4 }, tile] },
    { tiles: [{ ...tile, id: "r1" }, tile] },
    { tiles: [{ ...tile, goto: "details" }, tile] },
    { style: "grid", tiles },
    { color: "red", tiles },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact maximum lengths, all counts, styles and trends", () => {
    for (const arrange of ["grid", "rows"])
      for (const count of [2, 3, 4])
        for (const trend of ["up", "down", "flat"]) {
          const input = { label: "a".repeat(20), value: "1".repeat(8), unit: "a".repeat(8), trend };
          expect(
            props.safeParse({ arrange, tiles: Array.from({ length: count }, () => input) }).success,
          ).toBe(true);
        }
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["tiles"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["tiles"][number]["value"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Stats fallback and metadata", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    const seed = { id: "first", type: "record", sample: true };
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "record", fields: ["name", "totalCount", "due_today"] }],
        items: [{ ...seed, name: "First", totalCount: 12, due_today: " 3 " }],
      },
      {
        things: [],
        items: [
          { id: "first", type: "record", sample: true, amount: "-1.5" },
          { id: "other", type: "other", sample: true, amount: 8 },
          { id: "second", type: "record", sample: true, completed: "1,200" },
        ],
      },
      {
        things: [{ type: "record", fields: ["x".repeat(80), "second"] }],
        items: [{ id: "first", type: "record", sample: false, ["x".repeat(80)]: "1".repeat(80), second: 4 }],
      },
      {
        things: [{ type: "record", fields: ["bad", "count", "date", "blank"] }],
        items: [{ ...seed, bad: Number.NaN, count: {}, date: "2026-11-17", blank: " " }],
      },
      { things: [], items: [{ id: "first", type: "record", sample: true, count: 0 }] },
      { things: [], items: [{ id: "first", type: "record", sample: true, count: Infinity }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).tiles).toEqual([]);
    expect(fallback({ cast: casts[1]! }).tiles).toEqual([
      { label: "Total Count", value: "12" },
      { label: "Due today", value: "3" },
    ]);
    expect(fallback({ cast: casts[2]! }).tiles).toEqual([
      { label: "Amount", value: "-1.5" },
      { label: "Completed", value: "1,200" },
    ]);
    expect(fallback({ cast: casts[3]! }).tiles).toEqual([{ label: "Second", value: "4" }]);
    expect(fallback({ cast: casts[4]! }).tiles).toEqual(fallback({ cast: casts[0]! }).tiles);
    expect(fallback({ cast: casts[5]! }).tiles).toEqual([{ label: "Count", value: "0" }]);
  });
});

it("drops unavailable tiles in R2 without substituting a metric, even with usable cast data", () => {
  const cast: CastLike = { things: [], items: [{ id: "one", type: "record", sample: true, count: 9 }] };
  const invalid = [
    { label: "Item two", value: "0" },
    { label: "Pending", value: "—" },
    { label: "Late", value: "" },
    { label: "Total", value: "123456789" },
  ];
  const registry = createRegistry();
  const reject = (tiles: unknown[]) => repairComponent({ id: "s1", c: "Stats", tiles }, registry, { cast });
  const zero = { label: "Returned", value: "0" };
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  for (const kept of [[], [zero]]) {
    const padded = kept.map(({ label, value }) => ({ label: ` ${label} `, value: ` ${value} `, unit: null }));
    const repaired = reject([invalid[0], ...padded, ...invalid.slice(1)]);
    expect(repaired).toEqual({
      component: { id: "s1", c: "Stats", tiles: kept },
      codes: [lineCodes.array],
    });
    const { id: _id, c: _c, ...input } = repaired.component!;
    const html = renderInstance("Stats", input, "filled", theme);
    expect(html).not.toMatch(/Item two|Pending|Late|Total|123456789/);
    expect(html).toContain(kept.length ? ">0</span>" : "Nothing here yet");
  }
});

it("reads saved screens without their obsolete tiles or readdressing a surviving host tile", () => {
  const tiles = [
    { label: "Item one", value: "0", id: "r2" },
    { label: "Returned", value: "0", id: "r5" },
  ];
  const read = readComponent(components.Stats, { tiles }, "s1").join("\n");
  expect(read).toContain('r5 "Returned" · "0"');
  expect(read).not.toContain("Item one");
});

describe("Stats fallback and metadata", () => {
  it("declares only drawn parts and no actions", () => {
    expect(meta).toMatchObject({
      id: "Stats",
      group: "data",
      region: "body",
      weight: 2,
      tier: "phone",
      items: { key: "tiles", parts: ["root", "value", "unit", "label", "trend"] },
      parts: ["root"],
      states: ["filled", "empty", "loading"],
    });
    for (const example of examples)
      expect(affordancesOf(meta, stampItemIds(meta, props.parse(example)), "s1")).toEqual([]);
  });
  it("has a real path and well-formed choose and write probes", () => {
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("KeyValue");
    expect(meta.pick).toContain("Hero");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Stats")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "KeyValue")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Stats" });
  });
  it("builds a data-only registry with separator-tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Stats");
    expect(registry.schema("Stats")).toBe(props);
    expect(registry.resolve("s-t-a-t-s")).toBe("Stats");
    expect(registry.resolve("s-t-a-t-s")).toBe("Stats");
  });
});

function renderTiles(arrange: "grid" | "rows", count: number, state: "filled" | "empty" | "loading") {
  return renderInstance(
    "Stats",
    {
      arrange,
      tiles: Array.from({ length: count }, (_, index) => ({
        label: "a".repeat(20),
        value: "1".repeat(8),
        ...(index % 2 ? {} : { unit: "a".repeat(8) }),
        trend: (["up", "down", "flat", undefined] as const)[index],
      })),
    },
    state,
    { preset: "calm", mode: "light", accent: "moss" },
  );
}
describe.each(["grid", "rows"] as const)("Stats rendering in %s", (arrange) => {
  it.each([2, 3, 4])("renders %i tiles in every state", (count) => {
    for (const state of ["filled", "empty", "loading"] as const) {
      const html = renderTiles(arrange, count, state);
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      expect(html).not.toMatch(/role="(?:link|button)"/);
      if (state === "loading")
        expect(html.match(/aria-busy="true"/g)).toHaveLength(arrange === "grid" ? count : 1);
      if (state === "empty") expect(html).toContain("Nothing here yet");
      if (state !== "filled") continue;
      for (let index = 1; index <= count; index++) {
        for (const part of ["root", "label", "value"])
          expect(html.match(new RegExp(`data-testid="home/c1/r${index}/${part}"`, "g"))).toHaveLength(1);
        expect(html.includes(`data-testid="home/c1/r${index}/unit"`)).toBe(index % 2 === 1);
        expect(html.includes(`data-testid="home/c1/r${index}/trend"`)).toBe(index <= 3);
      }
    }
  });
});

// prettier-ignore
it.each([["tiles", "grid"], ["inline", "rows"]] as const)("migrates legacy %s to %s", (style, arrange) => {
  const legacy = { c: "Stats", id: "s1", style, tiles };
  const { c, id, ...raw } = migrateLine(legacy);
  expect({ c, id }).toEqual({ c: "Stats", id: "s1" });
  expect(props.safeParse({ style, tiles }).success).toBe(false);
  expect(stampItemIds(meta, props.parse(raw))).toMatchObject({ arrange, tiles: [{ id: "r1" }, { id: "r2" }] });
  expect(migrateLine({ ...legacy, arrange: "rows" })).toMatchObject({ arrange: "rows" });
});
