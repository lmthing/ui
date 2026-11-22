import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  changeLine,
  components,
  createRegistry,
  moneyLine,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Amount;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("money formatting", () => {
  it.each([
    [1240.5, "EUR", "none", "€1,240.50"],
    [18, "USD", "none", "$18"],
    [120, "GBP", "night", "£120 / night"],
    [9.99, "USD", "month", "$9.99 / month"],
    [0, "USD", "each", "$0 / each"],
    [5000, "JPY", "none", "¥5,000"],
  ] as const)("writes %s %s per %s as %s", (value, currency, per, expected) =>
    expect(moneyLine(value, currency, per)).toBe(expected),
  );
  it("signs a change and keeps cents only when needed", () => {
    expect(changeLine(32, "money", "USD")).toBe("+$32");
    expect(changeLine(-4.5, "money", "EUR")).toBe("-€4.50");
    expect(changeLine(3.2, "percent")).toBe("+3.2%");
    expect(changeLine(0, "money")).toBe("$0");
  });
});

describe("Amount schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults, trims text and derives the link flag", () => {
    expect(props.parse({ value: 5, label: " Total " })).toEqual({
      emphasis: "normal",
      detail: "full",
      label: "Total",
      value: 5,
      currency: "USD",
      per: "none",
      changeIn: "money",
      linked: false,
    });
    expect(props.parse({ value: 5, goto: "walks" })).toMatchObject({ linked: true });
  });
  it.each([
    {},
    { value: "5" },
    { value: NaN },
    { value: Infinity },
    { value: 5, currency: "XXX" },
    { value: 5, currency: "usd" },
    { value: 5, per: "fortnight" },
    { value: 5, changeIn: "points" },
    { value: 5, style: "large" },
    { value: 5, emphasis: "quiet" },
    { value: 5, surface: "tinted" },
    { value: 5, detail: "minimal" },
    { value: 5, label: "" },
    { value: 5, label: "a".repeat(25) },
    { value: 5, sub: "a".repeat(41) },
    { value: 5, goto: "Bad ID" },
    { value: 5, linked: true },
    { value: 5, symbol: "$" },
    { value: 5, color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts negative sums, changes and the exact limits", () => {
    expect(
      props.safeParse({ value: -12.3, was: -1, change: -0.5, label: "a".repeat(24), sub: "a".repeat(40) })
        .success,
    ).toBe(true);
  });
  it("types view props without presentation overrides", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["value"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps["emphasis"]>().toEqualTypeOf<"normal" | "hero">();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Amount fallback, metadata and reading", () => {
  it("validates with empty, full and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [{ type: "plant", fields: [] }], items: [] },
      { things: [{ type: "x".repeat(60), fields: [] }], items: [] },
    ];
    for (const cast of casts) {
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
      expect(fallback({ cast }).value).toBe(0);
    }
    expect(fallback({ cast: casts[1]! }).label).toBe("plant");
  });
  it("offers press only when linked", () => {
    expect(affordancesOf(meta, props.parse({ value: 5, goto: "walks" }), "a1")).toEqual([
      { address: "a1", part: "root", action: "press", detail: "→walks" },
    ]);
    expect(affordancesOf(meta, props.parse({ value: 5 }), "a1")).toEqual([]);
  });
  it("reads the sum, the old price and the change in the screen's currency", () => {
    const line = readComponent(
      components.Amount,
      { value: 1240.5, currency: "EUR", per: "month", was: 1500, change: -32, label: "Balance" },
      "a1",
    ).join("\n");
    for (const text of ["€1,240.50 / month", "€1,500", "-€32", '"Balance"']) expect(line).toContain(text);
    expect(readComponent(components.Amount, { style: "total", value: 54 }, "a1").join("\n")).toContain(
      "Total",
    );
    expect(readComponent(components.Amount, { value: 5 }, "a1", "loading")[0]).not.toContain("$5");
  });
  it("has a real path and well-formed probes", () => {
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const near of ["Stats", "Hero", "List"]) expect(meta.pick).toContain(near);
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Amount",
      "Stats",
    ]);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Amount" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 1,
      expect: { address: "a1", action: "press" },
    });
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.kind === "write" ? probe.brief : "";
      for (const name of [meta.id]) expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
  });
  it("resolves its ids", () => {
    const registry = createRegistry();
    expect(registry.resolve("a-m-o-u-n-t")).toBe("Amount");
    expect(registry.resolve("a-m-o-u-n-t")).toBe("Amount");
  });
});

describe("Amount rendering", () => {
  it.each(examples)("draws one root", (example) => {
    const html = renderInstance("Amount", example, "filled", theme);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html.match(/data-testid="home\/c1\/value"/g)).toHaveLength(1);
  });
  it("strikes an old price and colours a change by its direction", () => {
    const html = renderInstance("Amount", { value: 18, was: 20, change: -2 }, "filled", theme);
    expect(html).toContain("line-through");
    expect(html).toContain('data-testid="home/c1/was"');
    expect(html).toContain("-$2");
    expect(html).not.toContain('data-testid="home/c1/label"');
  });
  it("draws a skeleton while loading", () => {
    const html = renderInstance("Amount", { value: 18 }, "loading", theme);
    expect(html).toContain('aria-busy="true"');
  });
  it("draws the compact rate as secondary copy without adding an address", () => {
    const input = { value: 18, per: "each" };
    const html = renderInstance("Amount", input, "filled", { ...theme, density: "compact" });
    expect(html).toMatch(/\$18<span[^>]+> \/ each<\/span>/);
    expect(html.match(/data-testid="home\/c1\/value"/g)).toHaveLength(1);
    expect(readComponent(components.Amount, input, "a1")).toEqual(["a1 Amount $18 / each"]);
  });
  it("keeps the value and price parts while hiding the secondary note", () => {
    const input = { label: "Walks", value: 18, was: 20, change: -2, sub: "Morning routes" };
    const brief = { ...input, detail: "brief" };
    const parts = (value: unknown) =>
      [...renderInstance("Amount", value, "filled", theme).matchAll(/data-testid="([^"]+)"/g)].map(
        ([, address]) => address,
      );
    expect(meta.variantParts["detail.brief"].hides).toEqual(["sub"]);
    expect(parts(brief)).toEqual(parts(input).filter((address) => address !== "home/c1/sub"));
    expect(readComponent(components.Amount, brief, "a1").join(" ")).not.toContain(input.sub);
  });
});
