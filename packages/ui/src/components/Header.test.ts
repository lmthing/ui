import { describe, expect, expectTypeOf, it } from "vitest";
import { components, createRegistry, type CastLike, type Props } from "@lmthing/ui/catalog";
import { KitAction, KitRow, KitText } from "@lmthing/ui/kit";
import { Header } from "./Header";

const { props, meta, examples, fallback, probes } = components.Header;

describe("Header schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ title: "  My plants  " })).toEqual({ style: "large", title: "My plants" });
    expect(
      props.parse({ title: " Plants ", sub: " Today ", action: { icon: "plus", label: " Add " } }),
    ).toEqual({ style: "large", title: "Plants", sub: "Today", action: { icon: "plus", label: "Add" } });
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
  it("infers view props without item ids or visual values", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["title"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"large" | "inline" | "back">();
    expectTypeOf<NonNullable<ViewProps["action"]>["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expect(props.safeParse({ title: "Fern", id: "h1" }).success).toBe(false);
  });
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
      expect(result.style).toBe("large");
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
    expect(meta.actions).toEqual({ parts: { action: ["press"], back: ["press"] } });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("SectionTitle");
    expect(meta.pick).toContain("Hero");
    expect(meta.aliases.length).toBeGreaterThanOrEqual(3);
    expect(meta.aliases.length).toBeLessThanOrEqual(5);
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "SectionTitle")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Header" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      expect: { address: "h1/action", action: "press" },
    });
  });
  it("builds a data-only registry with case and separator tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Header");
    expect(registry.schema("Header")).toBe(props);
    expect(registry.resolve("top-bar")).toBe("Header");
    expect(registry.resolve("NAVBAR")).toBe("Header");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

describe("Header view", () => {
  it.each(["large", "inline", "back"] as const)(
    "composes the %s title, subtitle and icon-only actions",
    (style) => {
      const row = Header(
        props.parse({
          style,
          title: "Fern",
          sub: "Bathroom",
          action: { icon: "plus", label: "Add a plant", goto: "new_plant" },
        }),
      );
      const content = row.props as Parameters<typeof KitRow>[0];
      expect(row.type).toBe(KitRow);
      expect(content.item).toBe("");
      expect(content.children).toEqual([
        expect.objectContaining({
          type: KitText,
          props: { role: style === "large" ? "title" : "heading", part: "title", children: "Fern" },
        }),
        expect.objectContaining({
          type: KitText,
          props: { role: "caption", tone: "muted", part: "sub", children: "Bathroom" },
        }),
      ]);
      expect(content.trailing).toMatchObject({
        type: KitAction,
        props: { kind: "quiet", icon: "plus", part: "action", a11y: "Add a plant", goto: "new_plant" },
      });
      if (style === "back")
        expect(content.leading).toMatchObject({
          type: KitAction,
          props: { kind: "quiet", icon: "chevron_left", part: "back", a11y: "Fern", goto: "back" },
        });
      else expect(content.leading).toBeUndefined();
    },
  );
  it("omits the optional subtitle and action", () => {
    const content = Header(props.parse({ title: "Plants" })).props as Parameters<typeof KitRow>[0];
    expect(content.trailing).toBeUndefined();
    expect(content.children).toEqual([
      expect.objectContaining({ props: expect.objectContaining({ part: "title" }) }),
      undefined,
    ]);
  });
});
