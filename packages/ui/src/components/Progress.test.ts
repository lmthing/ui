import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Progress;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const bar = { label: "Protein", value: 62, of: 120, unit: "g" };

describe("Progress schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults, trims text and derives root presence", () => {
    expect(props.parse({ bars: [{ label: " Protein ", value: 1, of: 2 }] })).toEqual({
      style: "stack",
      bars: [{ label: "Protein", value: 1, of: 2, over: "warn", root: undefined }],
    });
    expect((props.parse({ bars: [{ ...bar, goto: "macros" }] }).bars[0] as { root?: string }).root).toBe(
      "macros",
    );
  });
  it.each([
    {},
    { bars: [] },
    { bars: Array.from({ length: 6 }, () => bar) },
    { bars: [{ ...bar, label: "" }] },
    { bars: [{ ...bar, label: "a".repeat(21) }] },
    { bars: [{ ...bar, value: -1 }] },
    { bars: [{ ...bar, of: 0 }] },
    { bars: [{ ...bar, of: -5 }] },
    { bars: [{ ...bar, value: "3" }] },
    { bars: [{ ...bar, value: NaN }] },
    { bars: [{ ...bar, unit: "a".repeat(9) }] },
    { bars: [{ ...bar, over: "red" }] },
    { bars: [{ ...bar, goto: "Bad ID" }] },
    { bars: [{ ...bar, root: "x" }] },
    { bars: [{ ...bar, color: "red" }] },
    { style: "ring", bars: [bar] },
    { bars: [bar], pixels: 4 },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts one to five bars at the exact limits, including a bar past its target", () => {
    const full = { label: "a".repeat(20), value: 1e6, of: 0.5, unit: "a".repeat(8), goto: "a".repeat(64) };
    for (let count = 1; count <= 5; count++)
      expect(props.safeParse({ bars: Array.from({ length: count }, () => full) }).success).toBe(true);
  });
  it("adds item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["bars"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"stack" | "compact">();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Progress fallback and metadata", () => {
  it("validates with empty, full and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
      },
      {
        things: [{ type: "plant", fields: ["name"] }],
        items: [{ id: "x", type: "plant", sample: true, name: 4 }],
      },
    ];
    for (const cast of casts) {
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
      for (const row of fallback({ cast }).bars) expect(row.value).toBe(0);
    }
    expect(fallback({ cast: casts[1]! }).bars[0]?.label).toBe("Fern");
  });
  it("declares item parts, states and press only on linked bars", () => {
    expect(meta).toMatchObject({ id: "Progress", group: "data", region: "body", weight: 2, tier: "phone" });
    expect(meta.items).toEqual({ key: "bars", parts: ["root", "label", "amount"] });
    expect(meta.states).toEqual(["filled", "empty", "loading"]);
    const linked = props.parse({ bars: [{ ...bar, goto: "macros" }, bar] });
    expect(affordancesOf(meta, stampItemIds(meta, linked), "p1")).toEqual([
      { address: "p1/r1", part: "root", action: "press", detail: "→macros" },
    ]);
    expect(affordancesOf(meta, stampItemIds(meta, props.parse({ bars: [bar] })), "p1")).toEqual([]);
  });
  it("reads each bar as its amount against its target", () => {
    const read = readComponent(
      components.Progress,
      { bars: [bar, { label: "Carbs", value: 180, of: 200 }] },
      "p1",
    );
    expect(read.join("\n")).toContain("62 of 120 g");
    expect(read.join("\n")).toContain("180 of 200");
    expect(readComponent(components.Progress, { bars: [bar] }, "p1", "loading")[0]).not.toContain("62");
  });
  it("has a real path and well-formed choose, write and read probes", () => {
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const near of ["Ring", "Bars", "Steps"]) expect(meta.pick).toContain(near);
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Progress",
      "Ring",
    ]);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Progress" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 1,
      expect: { address: "p1/r2", action: "press" },
    });
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.kind === "write" ? probe.brief : "";
      for (const name of [meta.id]) expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
  });
  it("resolves its ids and leaves the id to Progress, not Ring", () => {
    const registry = createRegistry();
    expect(registry.resolve("progress")).toBe("Progress");
    expect(registry.resolve("p-r-o-g-r-e-s-s")).toBe("Progress");
    expect(registry.resolve("p-r-o-g-r-e-s-s")).toBe("Progress");
    expect(registry.resolve("r-i-n-g")).toBe("Ring");
  });
});

describe("Progress rendering", () => {
  it.each(["stack", "compact"] as const)("draws one addressable item per bar in %s", (style) => {
    const input = { style, bars: [bar, { ...bar, label: "Carbs", value: 300, of: 200, over: "bad" }] };
    const html = renderInstance("Progress", input, "filled", theme);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    for (const index of [1, 2])
      for (const part of ["root", "label", "amount"])
        expect(html.match(new RegExp(`data-testid="home/c1/r${index}/${part}"`, "g"))).toHaveLength(1);
    expect(html).toContain("62 of 120 g");
    expect(html).toContain("300 of 200 g");
  });
});
