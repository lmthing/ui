import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  placeholderDetail,
  affordancesOf,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { KitIcon, KitBlock, KitText } from "@lmthing/ui/kit";
import { Note } from "./Note";

const { props, meta, examples, fallback, probes } = components.Note;

describe("Note schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ text: "  Supporting information  " })).toEqual({
      emphasis: "normal",
      media: "icon",
      text: "Supporting information",
      tone: "neutral",
    });
  });
  it.each([
    {},
    { text: "" },
    { text: " ".repeat(4) },
    { text: "a".repeat(121) },
    { text: 4 },
    { text: "Details", style: "plain" },
    { text: "Details", style: "hint" },
    { text: "Details", media: "cover" },
    { text: "Details", tone: "accent" },
    { text: "Details", icon: "unknown" },
    { text: "Details", color: "red" },
    { text: "Details", pixels: 4 },
    { text: "Details", id: "n1" },
    { text: "Details", goto: "next" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum length and every emphasis and tone", () => {
    for (const emphasis of meta.variants.emphasis)
      for (const tone of ["neutral", "good", "warn", "bad"])
        expect(props.safeParse({ text: "a".repeat(120), emphasis, tone, icon: "lightbulb" }).success).toBe(
          true,
        );
  });
  it("types view props without validator item ids", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["text"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["emphasis"]>().toEqualTypeOf<"normal" | "hero" | "quiet">();
    expectTypeOf<ViewProps["tone"]>().toEqualTypeOf<"neutral" | "good" | "warn" | "bad">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Note fallback", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "entry", fields: ["heading", "detail"] }],
        items: [{ id: "first", type: "entry", sample: true, heading: "First", detail: "More details" }],
      },
      {
        things: [{ type: "other", fields: ["name"] }],
        items: [
          { id: "first", type: "entry", sample: true, heading: "First" },
          { id: "second", type: "other", sample: true, name: "Second" },
        ],
      },
      {
        things: [{ type: "entry", fields: ["heading", "detail"] }],
        items: [
          { id: "first", type: "entry", sample: false, heading: "x".repeat(160), detail: "y".repeat(160) },
        ],
      },
      {
        things: [],
        items: [
          { id: "first", type: "entry", sample: true, heading: 4, detail: "  " },
          { id: "second", type: "entry", sample: true, heading: "Not the first" },
        ],
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({ text: placeholderDetail });
    expect(fallback({ cast: casts[1]! })).toEqual({ text: "More details" });
    expect(fallback({ cast: casts[2]! }).text).toBe("First");
    expect(fallback({ cast: casts[3]! }).text).toBe("y".repeat(120));
    expect(fallback({ cast: casts[4]! }).text).toBe(placeholderDetail);
  });
  it("uses declared field order and clips at a word boundary", () => {
    const cast: CastLike = {
      things: [{ type: "entry", fields: ["heading", "detail"] }],
      items: [
        {
          id: "first",
          type: "entry",
          sample: true,
          detail: `${"a".repeat(115)} longerword`,
          heading: "First",
        },
      ],
    };
    expect(fallback({ cast }).text).toBe("a".repeat(115));
    cast.items[0]!.detail = "";
    cast.items[0]!.heading = "x".repeat(160);
    expect(fallback({ cast }).text).toBe("x".repeat(120));
  });
});

describe("Note metadata and probes", () => {
  it("has the required metadata and well-formed choose and write probes", () => {
    expect(meta).toMatchObject({
      id: "Note",
      group: "content",
      region: "body",
      weight: 1,
      tier: "phone",
      parts: ["root", "text", "icon"],
      states: ["filled"],
    });
    expect(meta).not.toHaveProperty("actions");
    expect(meta).not.toHaveProperty("items");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Banner");
    expect(meta.pick).toContain("Hero");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Note")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Banner")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Note" });
    expect(probes.map((probe) => probe.kind)).not.toContain("read");
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.brief;
      for (const name of [meta.id, "Banner", "Hero"])
        expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
    expect(probes).toContainEqual(expect.objectContaining({ variant: { axis: "media", value: "none" } }));
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Note");
    expect(registry.schema("Note")).toBe(props);
    expect(registry.resolve("n-o-t-e")).toBe("Note");
    expect(registry.resolve("n-o-t-e")).toBe("Note");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

describe("Note view", () => {
  it.each(meta.variants.emphasis)("draws %s with the required bases, parts and tones", (emphasis) => {
    for (const tone of ["neutral", "good", "warn", "bad"] as const) {
      const view = Note(props.parse({ emphasis, tone, icon: "info", text: "Supporting information" }));
      expect(view.type).toBe(KitBlock);
      expect(view.props).toMatchObject({ label: "Supporting information" });
      const line = view.props.children;
      expect(line.type).toBe(KitText);
      expect(line.props).toMatchObject({
        role: "body",
        emphasis,
        tone: tone === "neutral" ? (emphasis === "quiet" ? "muted" : "text") : tone,
        part: "text",
        children: "Supporting information",
      });
      expect(view.props.leading.type).toBe(KitIcon);
      expect(view.props.leading.props).toMatchObject({
        name: "info",
        tone: tone === "neutral" ? "muted" : tone,
        part: "icon",
      });
    }
  });
  it("keeps icons optional by default and hides a supplied icon for media none", () => {
    const text = "Details";
    expect(meta.variantParts["media.none"]).toEqual({ hides: ["icon"] });
    expect(Note(props.parse({ text })).props.leading).toBeUndefined();
    expect(Note(props.parse({ text, icon: "info", media: "none" })).props.leading).toBeUndefined();
  });
  it.each(examples)("reads the shown sentence without offering actions", (example) => {
    const parsed = props.parse(example);
    const view = Note(parsed);
    expect(readComponent(components.Note, parsed, "n1").join("\n")).toContain(
      `"${view.props.children.props.children}"`,
    );
    expect(affordancesOf(meta, parsed, "n1")).toEqual([]);
  });
});
