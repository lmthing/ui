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

const { props, meta, examples, fallback, probes } = components.SectionTitle;

describe("SectionTitle schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and optional link labels", () => {
    expect(props.parse({ text: "  A group  " })).toEqual({
      text: "A group",
      detail: "full",
      link: undefined,
    });
    expect(props.parse({ text: " A group ", link: { label: " See all " } })).toEqual({
      text: "A group",
      detail: "full",
      link: { label: "See all" },
    });
  });
  it.each([
    {},
    { text: "" },
    { text: " ".repeat(4) },
    { text: "a".repeat(33) },
    { text: 4 },
    { text: "A group", style: "large" },
    { text: "A group", detail: "hidden" },
    { text: "A group", color: "red" },
    { text: "A group", pixels: 4 },
    { text: "A group", link: {} },
    { text: "A group", link: { goto: "details" } },
    { text: "A group", link: { label: "" } },
    { text: "A group", link: { label: " ".repeat(4) } },
    { text: "A group", link: { label: "a".repeat(17) } },
    { text: "A group", link: { label: 4 } },
    { text: "A group", link: { label: "See all", goto: "Bad ID" } },
    { text: "A group", link: { label: "See all", goto: "a".repeat(65) } },
    { text: "A group", link: { label: "See all", color: "red" } },
    { text: "A group", link: { label: "See all", icon: "plus" } },
    { text: "A group", link: [{ label: "See all" }] },
    { text: "A group", link: null },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact maximum lengths and Header's reference forms", () => {
    expect(
      props.safeParse({
        text: "a".repeat(32),
        link: { label: "a".repeat(16), goto: "a".repeat(64) },
      }).success,
    ).toBe(true);
    expect(props.safeParse({ text: "A group", link: { label: "Back", goto: "back" } }).success).toBe(true);
  });
  it("infers view props without item ids or visual values", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["text"]>().toEqualTypeOf<string>();
    expectTypeOf<NonNullable<ViewProps["link"]>["label"]>().toEqualTypeOf<string>();
    expectTypeOf<NonNullable<ViewProps["link"]>["goto"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expect(props.safeParse({ text: "A group", id: "s1" }).success).toBe(false);
  });
});

describe("SectionTitle fallback and metadata", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "record", fields: ["name"] }],
        items: [{ id: "first", type: "record", sample: true, name: "First" }],
      },
      { things: [], items: [{ id: "first", type: "entry", sample: true, name: "First" }] },
      {
        things: [{ type: "daily_entry", fields: ["name"] }],
        items: [{ id: "first", type: "daily_entry", sample: true, name: 4 }],
      },
      { things: [{ type: "x".repeat(80), fields: [] }], items: [] },
      { things: [{ type: "___", fields: [] }], items: [] },
    ];
    for (const cast of casts) {
      const result = fallback({ cast });
      expect(props.safeParse(result).success).toBe(true);
      expect(result).not.toHaveProperty("link");
    }
    expect(fallback({ cast: casts[0]! }).text).toBe("Item one");
    expect(fallback({ cast: casts[1]! }).text).toBe("Record");
    expect(fallback({ cast: casts[2]! }).text).toBe("Item one");
    expect(fallback({ cast: casts[3]! }).text).toBe("Daily entry");
    expect(fallback({ cast: casts[4]! }).text).toBe(`X${"x".repeat(31)}`);
    expect(fallback({ cast: casts[5]! }).text).toBe("Item one");
  });
  it("has the required parts, tier, real path and well-formed probes", () => {
    expect(meta).toMatchObject({
      id: "SectionTitle",
      group: "structure",
      region: "body",
      weight: 1,
      tier: "phone",
    });
    expect(meta.parts).toEqual(["root", "text", "link", "link_label"]);
    expect(meta.states).toEqual(["filled"]);
    expect(meta.actions).toEqual({ parts: { link: ["press"] } });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Header");
    expect(meta.pick).toContain("Hero");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Header")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "SectionTitle" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      expect: { address: "s1/link", action: "press" },
    });
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("SectionTitle");
    expect(registry.schema("SectionTitle")).toBe(props);
    expect(registry.resolve("s-e-c-t-i-o-n-t-i-t-l-e")).toBe("SectionTitle");
    expect(registry.resolve("s-e-c-t-i-o-n-t-i-t-l-e")).toBe("SectionTitle");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

describe("SectionTitle view", () => {
  it("omits a hidden link from both the view and the reader", () => {
    const input = { ...examples[0]!, detail: "brief" } as const;
    const html = renderInstance("SectionTitle", input, "filled", {
      preset: "calm",
      mode: "light",
      accent: "moss",
    });
    expect(meta.variantParts["detail.brief"]).toEqual({ hides: ["link", "link_label"] });
    expect(html).toContain('data-testid="home/c1/text"');
    expect(html).not.toContain('data-testid="home/c1/link"');
    expect(html).not.toContain('data-testid="home/c1/link_label"');
    expect(affordancesOf(meta, props.parse(input), "c1")).toEqual([]);
    expect(readComponent(components.SectionTitle, input, "c1").join(" ")).not.toContain("See all");
  });
  it("offers only the rendered link with and without optional navigation", () => {
    for (const optional of [
      {},
      { link: undefined },
      { link: { label: "See all" } },
      { link: { label: "See all", goto: "details" } },
      { link: { label: "See all", goto: "back" } },
    ]) {
      const input = { text: "A group", ...optional };
      const parsed = props.parse(input);
      const html = renderInstance("SectionTitle", input, "filled", {
        preset: "calm",
        mode: "light",
        accent: "moss",
      });
      const read = readComponent(components.SectionTitle, input, "c1").join("\n");
      const offered = affordancesOf(meta, parsed, "c1");
      expect(offered.map(({ part }) => part)).toEqual(parsed.link ? ["link"] : []);
      for (const { address, action } of offered) {
        expect(action).toBe("press");
        const tag = html.match(new RegExp(`<[^>]*data-testid="home/${address}"[^>]*>`))?.[0];
        expect(tag).toContain('role="button"');
      }
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      expect(html).toContain('data-testid="home/c1/text"');
      expect(html).toContain("A group");
      expect(html).not.toContain('role="listitem"');
      expect(html.includes('data-testid="home/c1/link"')).toBe(Boolean(parsed.link));
      expect(read.includes("[c1/link press")).toBe(Boolean(parsed.link));
      if (parsed.link) {
        expect(html).toContain('aria-label="See all"');
        expect(read).toContain("See all");
        if (parsed.link.goto) expect(read).toContain(`→${parsed.link.goto}`);
      }
    }
  });
});
