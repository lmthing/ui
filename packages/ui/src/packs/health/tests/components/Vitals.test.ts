import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  readComponent,
  stampItemIds,
  type as typography,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance, styleAt } from "../../../../../test/render";
const { props, meta, examples, fallback, probes } = components.Vitals;
const reading = examples[2]!.readings[0]!;
const input = { readings: [reading], goto: "add_reading" };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const castOf = (title: unknown): CastLike => ({
  things: [{ type: "record", fields: ["title"] }],
  items: [{ id: "one", type: "record", sample: true, title }],
});
describe("Vitals schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and preserves the paired reading", () => {
    expect(
      props.parse({
        ...input,
        readings: [{ ...reading, label: " Blood pressure ", unit: " mmHg ", at: " 08:10 " }],
      }),
    ).toEqual({ ...input, detail: "full", style: "band" });
  });
  it.each([
    {},
    { ...input, readings: [] },
    { ...input, readings: Array.from({ length: 5 }, () => reading) },
    ...[
      { label: "" },
      { label: " " },
      { label: "a".repeat(21) },
      { unit: "" },
      { unit: "u".repeat(9) },
      { at: "" },
      { at: "a".repeat(13) },
      { low: 121 },
      { high: 89 },
      { id: "r1" },
      { value: "118" },
      { status: "normal" },
      { tone: "bad" },
      { pixels: 4 },
      ...["value", "value2", "low", "high"].flatMap((key) =>
        [-1000001, 1000001, Infinity, NaN].map((value) => ({ [key]: value })),
      ),
    ].map((change) => ({ ...input, readings: [{ ...reading, ...change }] })),
    { ...input, goto: "Bad ID" },
    { ...input, goto: "a".repeat(65) },
    { ...input, color: "#ffffff" },
    { ...input, style: "tiles" },
  ])("rejects invalid input", (value) => expect(props.safeParse(value).success).toBe(false));
});
describe("Vitals boundaries", () => {
  it("accepts all exact limits, negative and fractional values, and equal reference bounds", () => {
    const max = {
      ...reading,
      label: "l".repeat(20),
      unit: "u".repeat(8),
      at: "a".repeat(12),
      value: -1000000,
      value2: 1000000,
      low: -1000000,
      high: 1000000,
    };
    expect(
      props.safeParse({ readings: Array.from({ length: 4 }, () => max), goto: "a".repeat(64) }).success,
    ).toBe(true);
    expect(
      props.safeParse({ ...input, readings: [{ ...reading, value: -0.25, low: -0.25, high: -0.25 }] })
        .success,
    ).toBe(true);
    expect(props.safeParse({ ...input, readings: [{ ...reading, value: 1000000 }] }).success).toBe(true);
  });
  it("adds ids only to view props", () => {
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["readings"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<View["readings"][number]["value2"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<View>().not.toBeAny();
    expectTypeOf<View>().not.toHaveProperty("color");
  });
});

describe("Vitals fallback and contract", () => {
  it("validates empty, useful, mixed, malformed and long casts using shared seeds", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      castOf("Morning"),
      {
        things: [],
        items: [
          { id: "one", type: "record", sample: true, title: "Morning" },
          { id: "two", type: "other", sample: true, name: "Evening" },
        ],
      },
      castOf(4),
      {
        things: [{ type: "record", fields: ["title"] }],
        items: Array.from({ length: 8 }, () => castOf("a".repeat(80)).items[0]!),
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    const neutral = fallback({ cast: casts[0]! });
    expect(neutral.goto).toBe("details");
    expect(neutral.readings.map((row) => row.label)).toEqual(["Item one", "Item two"]);
    expect(neutral.readings[0]).toMatchObject({ value: 0, unit: "0", low: 0, high: 1, at: "Details" });
    expect(fallback({ cast: casts[1]! }).readings[0]!.label).toBe("Morning");
    expect(fallback({ cast: casts[3]! }).readings[0]!.label).toBe("Item one");
    expect(fallback({ cast: casts[4]! }).readings).toHaveLength(2);
  });
  it("preserves the core-first near miss, tier, state and action contract", () => {
    expect(meta.status).toBe("ready");
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).toContain("read permission");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Stats");
    expect(meta.states).toEqual(["filled", "empty"]);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Stats")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Vitals" });
    expect(probes.filter((probe) => probe.kind === "read")).toHaveLength(2);
  });
});

describe("Vitals states, parts and read/act", () => {
  it.each(examples)("draws every present part once, and exposes matching readings and actions", (example) => {
    const html = renderInstance("Vitals", example, "filled", theme);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(elementAt(html, "home/c1/add").attributes).toContain('role="button"');
    const read = readComponent(components.Vitals, example, "v1").join("\n");
    example.readings.forEach((row, index) => {
      for (const part of meta.items.parts) {
        const address = `home/c1/r${index + 1}/${part}`;
        const hidden =
          (part === "value2" && !("value2" in row)) ||
          (part === "context" && !("context" in row)) ||
          (part === "band" && example.style === "history");
        if (hidden) expect(html).not.toContain(`data-testid="${address}"`);
        else expect(html.match(new RegExp(`data-testid="${address}"`, "g"))).toHaveLength(1);
      }
      expect(read).toContain(`${row.label}: ${row.value}`);
      const label = "value2" in row ? "Systolic reference" : "Reference";
      expect(read).toContain(`${label} ${row.low}–${row.high}`);
    });
    // prettier-ignore
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(example)), "v1")).toEqual([
      { address: "v1/add", action: "press", part: "add", detail: "→add_reading" },
      ...example.readings.map((_, index) => ({ address: `v1/r${index + 1}`, action: "press", part: "root", detail: "" })),
    ]);
  });
});
describe("Vitals empty, paired and repeated actions", () => {
  it("shows a calm cast-aware empty state without stale reading parts", () => {
    const html = renderInstance("Vitals", input, "empty", theme, "reading");
    expect(html).toContain("No readings yet");
    expect(html).toContain("Add reading");
    expect(html).not.toContain("Blood pressure");
    expect(html).not.toContain('data-testid="home/c1/r1/root"');
    expect(meta.read(input, "empty")).toEqual([]);
  });
  it.each([undefined, 0, 76, -1000000, 1000000])("renders a paired value %s", (value2) => {
    const html = renderInstance("Vitals", { ...input, readings: [{ ...reading, value2 }] }, "filled", theme);
    expect(html.includes('data-testid="home/c1/r1/value2"')).toBe(value2 !== undefined);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
    const compact = value2 === -1000000 || value2 === 1000000;
    const size = typography[compact ? "body" : "number"].size;
    for (const part of value2 === undefined ? ["value"] : ["value", "value2"])
      expect(styleAt(html, `home/c1/r1/${part}`)).toContain(`font-size:${size}px`);
    const unit = elementAt(html, "home/c1/r1/unit").children[0]!;
    expect(styleAt(html, unit)).toContain(`font-size:${typography.caption.size}px`);
  });
  it("dispatches repeated row presses and add navigation through the real controller", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const controller = createScreenController({
      screen: { id: "home", components: [{ id: "v1", c: "Vitals", ...input }] },
      defs: components,
      onAction,
      onLink,
      requireMounted: false,
    });
    expect(controller.press("home/v1/r1/root").ok).toBe(true);
    expect(controller.press("home/v1/r1/root").ok).toBe(true);
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onAction).toHaveBeenCalledWith({ address: "home/v1/r1", action: "press" });
    expect(controller.press("home/v1/add").ok).toBe(true);
    expect(onLink).toHaveBeenCalledWith("add_reading", "home/v1/add");
    expect(controller.press("home/v1/r1/band").ok).toBe(false);
    controller.dispose();
  });
});
