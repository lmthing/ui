import { describe, expect, expectTypeOf, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { config } from "../../test/render";
import { KitProvider, PartScope, renderers } from "@lmthing/ui/kit";
import {
  affordancesOf,
  components,
  createRegistry,
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
      style: "tiles",
      tiles: [{ label: "Count", value: "12", unit: "EUR" }, tile],
    });
  });
  it.each([
    {},
    { tiles: [] },
    { tiles: [tile] },
    { tiles: Array.from({ length: 5 }, () => tile) },
    { tiles: [{ ...tile, label: "" }, tile] },
    { tiles: [{ ...tile, label: " ".repeat(4) }, tile] },
    { tiles: [{ ...tile, label: "a".repeat(21) }, tile] },
    { tiles: [{ ...tile, value: "" }, tile] },
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
    for (const style of ["tiles", "inline"])
      for (const count of [2, 3, 4])
        for (const trend of ["up", "down", "flat"]) {
          const input = { label: "a".repeat(20), value: "1".repeat(8), unit: "a".repeat(8), trend };
          expect(props.safeParse({ style, tiles: Array.from({ length: count }, () => input) }).success).toBe(
            true,
          );
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
    expect(fallback({ cast: casts[0]! }).tiles).toEqual([
      { label: "Item one", value: "0" },
      { label: "Item two", value: "0" },
    ]);
    expect(fallback({ cast: casts[1]! }).tiles).toEqual([
      { label: "Total Count", value: "12" },
      { label: "Due today", value: "3" },
    ]);
    expect(fallback({ cast: casts[2]! }).tiles).toEqual([
      { label: "Amount", value: "-1.5" },
      { label: "Completed", value: "1,200" },
    ]);
    expect(fallback({ cast: casts[3]! }).tiles[0]).toEqual({
      label: `X${"x".repeat(19)}`,
      value: "1".repeat(8),
    });
    expect(fallback({ cast: casts[4]! }).tiles).toEqual(fallback({ cast: casts[0]! }).tiles);
    expect(fallback({ cast: casts[5]! }).tiles).toEqual([
      { label: "Count", value: "0" },
      { label: "Item two", value: "0" },
    ]);
  });
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
  it("builds a data-only registry with separator-tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Stats");
    expect(registry.schema("Stats")).toBe(props);
    expect(registry.resolve("TOTALS")).toBe("Stats");
    expect(registry.resolve("met-rics")).toBe("Stats");
  });
});

function renderTiles(style: "tiles" | "inline", count: number, state: "filled" | "empty" | "loading") {
  const input = props.parse({
    style,
    tiles: Array.from({ length: count }, (_, index) => ({
      label: "a".repeat(20),
      value: "1".repeat(8),
      ...(index % 2 ? {} : { unit: "a".repeat(8) }),
      trend: (["up", "down", "flat", undefined] as const)[index],
    })),
  });
  const scope = createElement(PartScope, {
    screen: "home",
    component: "c1",
    rev: 1,
    state,
    children: createElement(renderers.Stats, stampItemIds(meta, input) as Props<typeof props, typeof meta>),
  });
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  return renderToStaticMarkup(
    createElement(TamaguiProvider, { config }, createElement(KitProvider, { theme, children: scope })),
  );
}
describe.each(["tiles", "inline"] as const)("Stats rendering in %s", (style) => {
  it.each([2, 3, 4])("renders %i tiles in every state", (count) => {
    for (const state of ["filled", "empty", "loading"] as const) {
      const html = renderTiles(style, count, state);
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      expect(html).not.toMatch(/role="(?:link|button)"/);
      if (state === "loading")
        expect(html.match(/aria-busy="true"/g)).toHaveLength(style === "tiles" ? count : 1);
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
