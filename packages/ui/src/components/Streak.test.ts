import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Streak;
const input = { count: 12, label: "days watering on time", days: Array<boolean>(7).fill(false) };

describe("Streak schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and preserves the count and Monday-first booleans", () => {
    const value = { ...input, label: "  days walking  ", days: examples[1]!.days };
    expect(props.parse(value)).toEqual({ ...value, label: "days walking" });
    expect(props.parse(props.parse(value))).toEqual(props.parse(value));
  });
  it.each([
    {},
    { label: input.label, days: input.days },
    { count: 12, days: input.days },
    { count: 12, label: input.label },
    ...[-1, 1.5, "12", true, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map((count) => ({
      ...input,
      count,
    })),
    ...["", "   ", "a".repeat(25), 4].map((label) => ({ ...input, label })),
    ...[[], Array(6).fill(false), Array(8).fill(false), Array(7).fill(1), "Monday"].map((days) => ({
      ...input,
      days,
    })),
    { ...input, style: "tiles" },
    { ...input, color: "red" },
    { ...input, pixels: 4 },
    { ...input, id: "s1" },
    { ...input, goto: "next" },
  ])("rejects invalid input", (value) => expect(props.safeParse(value).success).toBe(false));
  it("accepts count boundaries, exact label length and every weekly completion pattern", () => {
    for (const count of [0, 1, Number.MAX_SAFE_INTEGER]) {
      for (let mask = 0; mask < 128; mask++) {
        const days = Array.from({ length: 7 }, (_, day) => Boolean(mask & (1 << day)));
        expect(props.safeParse({ count, label: "a".repeat(24), days }).success).toBe(true);
      }
    }
  });
  it("infers view props without item ids or visual overrides", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["count"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps["days"]>().toEqualTypeOf<boolean[]>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Streak fallback", () => {
  it("validates with empty, full, mixed, long and malformed casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
      },
      {
        things: [
          { type: "walk", fields: [] },
          { type: "plant", fields: [] },
        ],
        items: [{ id: "fern", type: "plant", sample: false, name: "Fern" }],
      },
      { things: [{ type: "x".repeat(80), fields: [] }], items: [] },
      { things: [{ type: " ", fields: [] }], items: [] },
      { things: [], items: [{ id: "fern", type: "plant", sample: true, name: 4 }] },
    ];
    for (const cast of casts) {
      const value = fallback({ cast });
      expect(props.safeParse(value).success).toBe(true);
      expect(value.count).toBe(0);
      expect(value.days).toEqual(Array(7).fill(false));
    }
    expect(fallback({ cast: casts[0]! }).label).toBe("Item one");
    expect(fallback({ cast: casts[1]! }).label).toBe("plant");
    expect(fallback({ cast: casts[2]! }).label).toBe("walk");
    expect(fallback({ cast: casts[3]! }).label).toBe("x".repeat(24));
    expect(fallback({ cast: casts[4]! }).label).toBe("Item one");
    expect(fallback({ cast: casts[5]! }).label).toBe("Item one");
  });
});

describe("Streak metadata and probes", () => {
  it("declares the required parts, filled state and no actions", () => {
    expect(meta).toMatchObject({
      id: "Streak",
      group: "data",
      region: "body",
      weight: 2,
      tier: "phone",
      parts: ["root", "count", "label", "days"],
      states: ["filled"],
    });
    expect(meta).not.toHaveProperty("actions");
    expect(meta).not.toHaveProperty("items");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Stats");
    expect(meta.pick).toContain("Steps");
  });
  it("has two well-formed choose probes with a Stats near miss and one write", () => {
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Streak")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Stats")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Streak" });
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.brief;
      for (const name of [meta.id])
        expect(wording.toLowerCase()).not.toMatch(new RegExp(`\\b${name.toLowerCase()}\\b`));
    }
  });
  it("registers with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Streak");
    expect(registry.schema("Streak")).toBe(props);
    expect(registry.resolve("s-t-r-e-a-k")).toBe("Streak");
    expect(registry.resolve("s-t-r-e-a-k")).toBe("Streak");
  });
  it("reads the count and completed weekdays without leaking unsupported state values", () => {
    expect(meta.read(input, "filled")).toEqual(["12 days", "none done this week"]);
    expect(
      meta.read({ ...input, count: 1, days: [false, true, false, true, false, true, true] }, "filled"),
    ).toEqual(["1 day", "done Tue, Thu, Sat, Sun"]);
    expect(meta.read(examples[0], "filled")).toEqual(["12 days", "done Mon, Tue, Wed, Thu, Fri"]);
    expect(meta.read(input, "loading")).toEqual([]);
    expect(meta.read(input, "empty")).toEqual([]);
    const read = readComponent(components.Streak, examples[0], "c1").join("\n");
    expect(read).toContain("12 days");
    expect(read).toContain("done Mon, Tue, Wed, Thu, Fri");
    expect(read).toContain('"days watering on time"');
  });
});

describe("Streak view and reading", () => {
  it("draws every part once with a decorative seven-day strip and no controls", () => {
    for (const count of [0, 1, 12]) {
      for (const days of [input.days, Array<boolean>(7).fill(true), examples[1]!.days]) {
        const value = { ...input, count, days };
        const html = renderInstance("Streak", value, "filled", {
          preset: "calm",
          mode: "light",
          accent: "moss",
        });
        for (const part of meta.parts)
          expect(html.match(new RegExp(`data-testid="home/c1/${part}"`, "g"))).toHaveLength(1);
        expect(html.match(/<[^>]*data-testid="home\/c1\/days"[^>]*>/)?.[0]).toContain('aria-hidden="true"');
        expect(html).not.toMatch(/role="(?:link|button|checkbox|radio)"/);
        expect(html).not.toContain('data-testid="home/c1/icon"');
        expect(html).toContain(input.label);
        expect(readComponent(components.Streak, value, "c1").join("\n")).toContain(String(count));
        expect(affordancesOf(meta, props.parse(value), "c1")).toEqual([]);
      }
    }
  });
});
