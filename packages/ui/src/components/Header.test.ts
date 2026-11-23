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

const { props, meta, examples, fallback, probes } = components.Header;

describe("Header schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ title: "  My plants  " })).toEqual({
      emphasis: "normal",
      detail: "full",
      title: "My plants",
      action: undefined,
    });
    expect(
      props.parse({ title: " Plants ", sub: " Today ", action: { icon: "plus", label: " Add " } }),
    ).toMatchObject({
      emphasis: "normal",
      title: "Plants",
      sub: "Today",
      action: { icon: "plus", label: "Add" },
    });
  });
  it.each([
    {},
    { title: "" },
    { title: " ".repeat(4) },
    { title: "a".repeat(29) },
    { title: 4 },
    { title: "Plants", sub: "" },
    { title: "Plants", sub: "a".repeat(41) },
    { title: "Plants", style: "grid" },
    { title: "Plants", style: "inline" },
    { title: "Plants", emphasis: "hero" },
    { title: "Plants", color: "red" },
    { title: "Plants", pixels: 4 },
    { title: "Plants", action: {} },
    { title: "Plants", action: { label: "Add" } },
    { title: "Plants", action: { icon: "plus" } },
    { title: "Plants", action: { icon: "plus", label: "" } },
    { title: "Plants", action: { icon: "plus", label: " ".repeat(4) } },
    { title: "Plants", action: { icon: "plus", label: "a".repeat(17) } },
    { title: "Plants", action: { icon: "unknown", label: "Add" } },
    { title: "Plants", action: { icon: "plus", label: "Add", goto: "Bad ID" } },
    { title: "Plants", action: { icon: "plus", label: "Add", goto: "a".repeat(65) } },
    { title: "Plants", action: { icon: "plus", label: "Add", color: "red" } },
    { title: "Plants", action: [{ icon: "plus", label: "Add" }] },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum lengths and reference forms", () => {
    expect(
      props.safeParse({
        title: "a".repeat(28),
        sub: "a".repeat(40),
        action: { icon: "plus", label: "a".repeat(16), goto: "a".repeat(64) },
      }).success,
    ).toBe(true);
    expect(
      props.safeParse({ title: "Fern", action: { icon: "chevron_left", label: "Back", goto: "back" } })
        .success,
    ).toBe(true);
  });
});

it("infers view props without item ids or visual values", () => {
  type ViewProps = Props<typeof props, typeof meta>;
  expectTypeOf<ViewProps["title"]>().toEqualTypeOf<string>();
  expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"back" | undefined>();
  expectTypeOf<NonNullable<ViewProps["action"]>["label"]>().toEqualTypeOf<string>();
  expectTypeOf<ViewProps>().not.toBeAny();
  expectTypeOf<ViewProps>().not.toHaveProperty("color");
  expect(props.safeParse({ title: "Fern", id: "h1" }).success).toBe(false);
});

describe("Header fallback and metadata", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name", "room"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
      },
      { things: [], items: [{ id: "dog", type: "dog", sample: true, name: "Clover" }] },
      {
        things: [{ type: "dog_walk", fields: ["name"] }],
        items: [{ id: "walk", type: "dog_walk", sample: true, name: 4 }],
      },
      { things: [{ type: "x".repeat(80), fields: [] }], items: [] },
      { things: [{ type: "___", fields: [] }], items: [] },
    ];
    for (const cast of casts) {
      const result = fallback({ cast });
      expect(props.safeParse(result).success).toBe(true);
      expect(result).not.toHaveProperty("style");
      expect(result).not.toHaveProperty("action");
    }
    expect(fallback({ cast: casts[0]! }).title).toBe("Item one");
    expect(fallback({ cast: casts[1]! }).title).toBe("Plant");
    expect(fallback({ cast: casts[2]! }).title).toBe("Item one");
    expect(fallback({ cast: casts[3]! }).title).toBe("Dog walk");
    expect(fallback({ cast: casts[4]! }).title).toBe(`X${"x".repeat(27)}`);
    expect(fallback({ cast: casts[5]! }).title).toBe("Item one");
  });
  it("has the required parts, tier, real path and well-formed probes", () => {
    expect(meta).toMatchObject({ id: "Header", group: "structure", region: "top", weight: 1, tier: "phone" });
    expect(meta.parts).toEqual(["root", "title", "sub", "action", "back"]);
    expect(meta.states).toEqual(["filled"]);
    expect(meta.actions).toEqual({
      parts: { action: ["press"], back: ["press"] },
      when: { back: { style: "back" } },
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("SectionTitle");
    expect(meta.pick).toContain("Hero");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "SectionTitle")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Header" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      expect: { address: "h1/action", action: "press" },
    });
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Header");
    expect(registry.schema("Header")).toBe(props);
    expect(registry.resolve("h-e-a-d-e-r")).toBe("Header");
    expect(registry.resolve("h-e-a-d-e-r")).toBe("Header");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

describe("Header view", () => {
  it.each([{}, { emphasis: "quiet" }, { style: "back" }] as const)(
    "offers only rendered buttons for %j with and without optional props",
    (variant) => {
      const back = "style" in variant;
      for (const optional of [
        {},
        { action: undefined },
        { action: { icon: "plus", label: "Add a plant" } },
        { sub: "Bathroom", action: { icon: "plus", label: "Add a plant", goto: "new_plant" } },
      ]) {
        const input = { ...variant, title: "Fern", ...optional };
        const parsed = props.parse(input);
        const html = renderInstance("Header", input, "filled", {
          preset: "calm",
          mode: "light",
          accent: "moss",
        });
        const read = readComponent(components.Header, input, "c1").join("\n");
        const offered = affordancesOf(meta, parsed, "c1");
        expect(offered.map(({ part }) => part)).toEqual([
          ...(parsed.action ? ["action"] : []),
          ...(back ? ["back"] : []),
        ]);
        if (back) expect(offered.find(({ part }) => part === "back")?.detail).toBe("→back");
        for (const { address, action } of offered) {
          expect(action).toBe("press");
          const tag = html.match(new RegExp(`<[^>]*data-testid="home/${address}"[^>]*>`))?.[0];
          expect(tag).toContain('role="button"');
        }
        expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
        expect(html).toContain('data-testid="home/c1/title"');
        expect(html.includes('data-testid="home/c1/sub"')).toBe(Boolean(parsed.sub));
        expect(html.includes('data-testid="home/c1/action"')).toBe(Boolean(parsed.action));
        expect(html.includes('data-testid="home/c1/back"')).toBe(back);
        expect(html.includes('aria-label="Back"')).toBe(back);
        expect(read.includes("[c1/action press")).toBe(Boolean(parsed.action));
        expect(read.includes("[c1/back press")).toBe(back);
        if (parsed.action) expect(html).toContain('aria-label="Add a plant"');
      }
    },
  );
  it("hides only the subtitle in brief and keeps both shortcuts available", () => {
    const input = { ...examples[0]!, style: "back", detail: "brief" } as const;
    const html = renderInstance("Header", input, "filled", { preset: "calm", mode: "light", accent: "moss" });
    expect(meta.variantParts["detail.brief"]).toEqual({ hides: ["sub"] });
    expect(html).not.toContain('data-testid="home/c1/sub"');
    expect(readComponent(components.Header, input, "c1").join(" ")).not.toContain(input.sub);
    expect(affordancesOf(meta, props.parse(input), "c1").map(({ address }) => address)).toEqual([
      "c1/action",
      "c1/back",
    ]);
  });
});
