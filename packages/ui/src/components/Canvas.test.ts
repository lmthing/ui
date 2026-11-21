import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { KitCard, KitEmpty } from "@lmthing/ui/kit";
import { renderInstance } from "../../test/render";
import { Canvas } from "./Canvas";

const { props, meta, examples, fallback, probes } = components.Canvas;

describe("Canvas schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims the caption and defaults to the existing outline", () => {
    expect(props.parse({ caption: "  A drawing tool  " })).toEqual({
      caption: "A drawing tool",
      surface: "outlined",
    });
  });
  it.each([
    {},
    null,
    { caption: "" },
    { caption: " ".repeat(4) },
    { caption: "a".repeat(81) },
    { caption: 4 },
    { caption: true },
    { caption: [] },
    { caption: "A drawing tool", style: "plain" },
    { caption: "A drawing tool", surface: "card" },
    { caption: "A drawing tool", media: "none" },
    { caption: "A drawing tool", icon: "palette" },
    { caption: "A drawing tool", color: "red" },
    { caption: "A drawing tool", pixels: 4 },
    { caption: "A drawing tool", id: "c1" },
    { caption: "A drawing tool", goto: "next" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum caption length", () => {
    expect(props.parse({ caption: "a".repeat(80) }).caption).toHaveLength(80);
  });
  it("types view props without item ids or visual overrides", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["caption"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Canvas fallback", () => {
  it("uses the first item's title with its declared field order", () => {
    const cast: CastLike = {
      things: [{ type: "entry", fields: ["heading", "detail"] }],
      items: [
        { id: "first", type: "entry", sample: true, detail: "Second text", heading: "  First title  " },
        { id: "second", type: "entry", sample: false, heading: "Second title" },
      ],
    };
    expect(fallback({ cast })).toEqual({ caption: "First title" });
    expect(props.safeParse(fallback({ cast })).success).toBe(true);
  });
  it("uses the first item even when another thing is listed first", () => {
    const cast: CastLike = {
      things: [
        { type: "other", fields: ["name"] },
        { type: "entry", fields: ["heading"] },
      ],
      items: [{ id: "first", type: "entry", sample: false, heading: "First title" }],
    };
    expect(fallback({ cast })).toEqual({ caption: "First title" });
  });
  it("validates empty and malformed casts with shared neutral placeholders", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [{ type: "entry", fields: ["heading"] }], items: [] },
      { things: [], items: [{ id: "first", type: "entry", sample: true, heading: 4 }] },
      { things: [], items: [{ id: "first", type: "entry", sample: true, heading: "   " }] },
      {
        things: [],
        items: [
          { id: "first", type: "entry", sample: true, heading: 4 },
          { id: "second", type: "entry", sample: true, heading: "Second title" },
        ],
      },
    ];
    for (const cast of casts) {
      expect(fallback({ cast })).toEqual({ caption: placeholderTitle(0) });
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    }
  });
  it("clips long titles to the caption limit", () => {
    const cast: CastLike = {
      things: [],
      items: [{ id: "first", type: "entry", sample: true, heading: "x".repeat(120) }],
    };
    expect(fallback({ cast })).toEqual({ caption: "x".repeat(80) });
    expect(props.safeParse(fallback({ cast })).success).toBe(true);
  });
});

describe("Canvas metadata and probes", () => {
  it("declares only the root and caption, one filled state, and no actions", () => {
    expect(meta).toMatchObject({
      id: "Canvas",
      group: "escape",
      region: "body",
      weight: 3,
      tier: "phone",
      parts: ["root", "caption"],
      states: ["filled"],
    });
    expect(meta).not.toHaveProperty("actions");
    expect(meta).not.toHaveProperty("items");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Only");
    expect(meta.pick).toContain("Empty");
    expect(meta.pick).toContain("Photo");
  });
  it("has two choose probes with an Empty near miss and a write probe for the plain surface", () => {
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Canvas")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Empty")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Canvas" });
    expect(probes).toContainEqual(expect.objectContaining({ variant: { axis: "surface", value: "plain" } }));
    expect(probes.map((probe) => probe.kind)).not.toContain("read");
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.brief;
      for (const name of [meta.id, "Empty", "Photo"])
        expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
  });
  it("registers with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Canvas");
    expect(registry.schema("Canvas")).toBe(props);
    expect(registry.resolve("c-a-n-v-a-s")).toBe("Canvas");
    expect(registry.resolve("c-a-n-v-a-s")).toBe("Canvas");
  });
});

describe("Canvas view and reading", () => {
  it.each(examples)("draws the selected surface with a decorative soft icon", (example) => {
    const parsed = props.parse(example);
    const view = Canvas(parsed);
    expect(view.type).toBe(KitCard);
    expect(view.props).toMatchObject({ surface: parsed.surface, part: "root", padded: true });
    expect(view.props.children.type).toBe(KitEmpty);
    expect(view.props.children.props).toEqual({
      title: example.caption,
      part: "caption",
      icon: "palette",
      fill: parsed.surface === "outlined",
      decorativeIcon: true,
    });
  });
  it.each([...examples, { caption: "a".repeat(80) }])(
    "renders only its declared addresses and reads the caption without actions",
    (example) => {
      const parsed = props.parse(example);
      const html = renderInstance("Canvas", parsed, "filled", {
        preset: "calm",
        mode: "light",
        accent: "moss",
      });
      expect([...html.matchAll(/data-testid="home\/c1\/([^"]+)"/g)].map((match) => match[1])).toEqual([
        ...meta.parts,
      ]);
      expect(html).not.toMatch(/role="(?:button|link|checkbox|radio)"/);
      expect(html).toContain(parsed.caption);
      expect(readComponent(components.Canvas, parsed, "c1").join("\n")).toContain(parsed.caption);
      expect(affordancesOf(meta, parsed, "c1")).toEqual([]);
    },
  );
});
