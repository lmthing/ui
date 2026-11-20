import { describe, expect, expectTypeOf, it } from "vitest";
import { renderInstance } from "../../test/render";

import {
  affordancesOf,
  components,
  placeholderTitle,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.Bars;
const point = { label: "Mon", value: 3 };
const input = { title: "This week", points: [point, { label: "Tue", value: 5 }] };

describe("Bars schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and leaves the unit optional", () => {
    expect(
      props.parse({ title: " This week ", unit: " walks ", points: [{ label: " Mon ", value: 0 }, point] }),
    ).toEqual({
      style: "columns",
      detail: "full",
      title: "This week",
      unit: "walks",
      points: [{ label: "Mon", value: 0 }, point],
    });
    expect(props.parse(input)).not.toHaveProperty("unit");
  });
  it.each([
    {},
    { ...input, title: "" },
    { ...input, title: "a".repeat(33) },
    { ...input, unit: "" },
    { ...input, unit: "a".repeat(9) },
    { ...input, points: [] },
    { ...input, points: [point] },
    { ...input, points: Array.from({ length: 8 }, () => point) },
    ...["", " ", "a".repeat(5), 3].map((label) => ({ ...input, points: [{ ...point, label }, point] })),
    ...[-1, "3", null, NaN, Infinity, -Infinity].map((value) => ({
      ...input,
      points: [{ ...point, value }, point],
    })),
    ...[{ id: "r1" }, { goto: "details" }, { color: "red" }, { pixels: 4 }].map((invalid) => ({
      ...input,
      points: [{ ...point, ...invalid }, point],
    })),
    { ...input, style: "donut" },
    { ...input, detail: "all" },
    { ...input, density: "narrow" },
    { ...input, style: "share", points: Array.from({ length: 7 }, () => point) },
    { ...input, style: "share", points: [{ ...point, label: "a".repeat(17) }, point] },
    { ...input, color: "red" },
    { ...input, total: 8 },
  ])("rejects invalid input", (value) => expect(props.safeParse(value).success).toBe(false));
  it("accepts every count, exact limits, zero and fractional values", () => {
    for (let count = 2; count <= 7; count++)
      expect(
        props.safeParse({
          title: "a".repeat(32),
          unit: "a".repeat(8),
          points: Array.from({ length: count }, (_, index) => ({ label: "a".repeat(4), value: index / 2 })),
        }).success,
      ).toBe(true);
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["points"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["points"][number]["value"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

it("hides only the combined total while retaining the point addresses and values", () => {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  const brief = { ...input, detail: "brief" };
  const html = renderInstance("Bars", brief, "filled", theme);
  expect(meta.variantParts["detail.brief"].hides).toEqual(["total"]);
  expect(html).not.toContain('data-testid="home/c1/total"');
  for (const item of ["r1", "r2"]) expect(html).toContain(`data-testid="home/c1/${item}/label"`);
  expect(meta.read(props.parse(brief), "filled")).toEqual(["Mon 3, Tue 5"]);
});

describe("Bars fallback", () => {
  it("validates empty, full, mixed and malformed casts with neutral placeholders", () => {
    const seed = { id: "one", type: "record", sample: true };
    const thing = { type: "record", fields: ["name", "amount"] };
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [thing], items: [{ ...seed, name: "First", amount: 4 }] },
      {
        things: [],
        items: [
          { ...seed, title: "First", amount: 0 },
          { id: "two", type: "other", sample: true, title: "Other", amount: 8 },
        ],
      },
      {
        things: [thing],
        items: Array.from({ length: 9 }, () => ({ ...seed, name: "y".repeat(80), amount: 0.5 })),
      },
      { things: [thing], items: [{ ...seed, name: {}, amount: NaN }] },
      { things: [{ type: " ", fields: [] }], items: [] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    const empty = fallback({ cast: casts[0]! });
    expect(empty.title).toBe(placeholderTitle(0));
    expect(empty.points).toEqual(Array.from({ length: 7 }, () => ({ label: "Item", value: 0 })));
    expect(fallback({ cast: casts[1]! })).toEqual({
      title: "record",
      points: [
        { label: "Firs", value: 4 },
        { label: "Item", value: 0 },
      ],
    });
    expect(fallback({ cast: casts[2]! }).points).toHaveLength(2);
    expect(fallback({ cast: casts[3]! }).points).toHaveLength(7);
    for (const value of [-1, NaN, Infinity, {}, "4"])
      expect(
        fallback({ cast: { things: [], items: [{ ...seed, name: "Name", amount: value }] } }).points[0]
          ?.value,
      ).toBe(0);
    expect(
      fallback({ cast: { things: [{ ...thing, type: "x".repeat(80) }], items: [] } }).title,
    ).toHaveLength(32);
  });
});

describe("Bars metadata and reading", () => {
  it("declares exactly the drawn parts, states, and no actions", () => {
    expect(meta).toMatchObject({
      id: "Bars",
      group: "data",
      region: "body",
      weight: 2,
      tier: "phone",
      items: { key: "points", parts: ["root", "label"] },
      parts: ["root", "title", "total"],
      states: ["filled", "empty", "loading"],
    });
    for (const example of examples)
      expect(affordancesOf(meta, stampItemIds(meta, props.parse(example)), "c1")).toEqual([]);
  });
  it("has a real path and the required choose and write probes", () => {
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Stats");
    expect(meta.pick).toContain("Sparkline");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Bars")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Stats")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Bars" });
  });
  it("reads each amount and the same total shown, only in the filled state", () => {
    const expected = ["Total 8 walks", "Mon 3, Tue 5"];
    expect(meta.read(props.parse({ ...input, unit: "walks" }), "filled")).toEqual(expected);
    expect(meta.read(stampItemIds(meta, props.parse(input)), "filled")).toEqual(["Total 8", "Mon 3, Tue 5"]);
    for (const state of ["empty", "loading"] as const) expect(meta.read(input, state)).toEqual([]);
  });
});
