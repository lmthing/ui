import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  placeholderDetail,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

import { elementAt, renderInstance, styleAt } from "../../test/render";
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const { props, meta, examples, fallback, probes } = components.Hero;

describe("Hero schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ title: "  Main message  ", sub: "  A little detail  " })).toEqual({
      style: "statement",
      title: "Main message",
      sub: "A little detail",
      tone: "neutral",
    });
    expect(props.parse({ title: "3 of 5", style: "number" })).toEqual({
      style: "number",
      title: "3 of 5",
      tone: "neutral",
    });
  });
  it.each([
    {},
    { title: "" },
    { title: " ".repeat(4) },
    { title: 2 },
    { title: "a".repeat(41) },
    { title: "Headline", sub: "" },
    { title: "Headline", sub: " ".repeat(4) },
    { title: "Headline", sub: "a".repeat(81) },
    { title: "Headline", photo: "https://example.org/image.png" },
    { title: "Headline", photo: `lib:${"a".repeat(61)}` },
    { title: "Headline", photo: "local:dog" },
    { title: "Headline", style: "banner" },
    { title: "Headline", tone: "accent" },
    { title: "Headline", tone: "red" },
    { title: "Headline", color: "red" },
    { title: "Headline", pixels: 4 },
    { title: "Headline", goto: "next" },
    { title: "Headline", id: "h1" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum lengths and reference forms", () => {
    expect(
      props.safeParse({ title: "a".repeat(40), sub: "a".repeat(80), photo: `lib:${"a".repeat(60)}` }).success,
    ).toBe(true);
    expect(props.safeParse({ title: "Headline", photo: "local:1" }).success).toBe(true);
    for (const style of ["statement", "photo", "number"])
      for (const tone of ["neutral", "good", "warn", "bad"])
        expect(props.safeParse({ title: "3 of 5", style, tone }).success).toBe(true);
  });
  it("derives view props without adding item ids or visual controls", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["title"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["sub"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"statement" | "photo" | "number">();
    expectTypeOf<ViewProps["tone"]>().toEqualTypeOf<"neutral" | "good" | "warn" | "bad">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expectTypeOf<ViewProps>().not.toHaveProperty("goto");
  });
});

const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "plant", fields: ["name", "room"] }],
    items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
  },
  {
    things: [{ type: "plant", fields: ["name", "room"] }],
    items: [
      { id: "dog", type: "dog", sample: true, title: "Clover", detail: "Morning walk" },
      { id: "plant", type: "plant", sample: true, name: "Fern", room: "Bathroom" },
    ],
  },
  {
    things: [{ type: "plant", fields: ["name", "room"] }],
    items: [{ id: "fern", type: "plant", sample: false, name: "x".repeat(80), room: "y".repeat(100) }],
  },
  { things: [], items: [{ id: "fern", type: "plant", sample: true, name: 4 }] },
  {
    things: [{ type: "item", fields: ["summary", "detail", "name"] }],
    items: [
      {
        id: "one",
        type: "item",
        sample: false,
        name: "Not first",
        summary: "  First  ",
        detail: "  Second  ",
      },
    ],
  },
  {
    things: [],
    items: [
      { id: "one", type: "item", sample: false, title: " " },
      { id: "two", type: "item", sample: false, title: "Do not skip ahead" },
    ],
  },
  { things: [], items: [{ id: "one", type: "item", sample: false, title: "Only a title" }] },
];

describe("Hero fallback and metadata", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({
      style: "statement",
      title: placeholderTitle(0),
      sub: placeholderDetail,
    });
    expect(fallback({ cast: casts[1]! })).toEqual({ style: "statement", title: "Fern", sub: "Bathroom" });
    expect(fallback({ cast: casts[2]! })).toEqual({
      style: "statement",
      title: "Clover",
      sub: "Morning walk",
    });
    expect(fallback({ cast: casts[3]! })).toEqual({
      style: "statement",
      title: "x".repeat(40),
      sub: "y".repeat(80),
    });
    expect(fallback({ cast: casts[4]! })).toEqual(fallback({ cast: casts[0]! }));
    expect(fallback({ cast: casts[5]! })).toEqual({ style: "statement", title: "First", sub: "Second" });
    expect(fallback({ cast: casts[6]! })).toEqual(fallback({ cast: casts[0]! }));
    expect(fallback({ cast: casts[7]! })).toEqual({
      style: "statement",
      title: "Only a title",
      sub: placeholderDetail,
    });
  });
  it("has the required parts, states, tier and well-formed choose and write probes", () => {
    expect(meta).toMatchObject({ id: "Hero", group: "content", region: "body", weight: 3, tier: "phone" });
    expect(meta.parts).toEqual(["root", "title", "sub", "photo"]);
    expect(meta.states).toEqual(["filled", "loading"]);
    expect(meta).not.toHaveProperty("items");
    expect(meta).not.toHaveProperty("actions");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Note");
    expect(meta.pick).toContain("Stats");
    expect(meta.pick).toContain("Banner");
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Hero")).toMatchObject({
      need: "Make the main message of my plant screen that two plants need water today",
    });
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Hero")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Note")).toBeDefined();
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(1);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Hero" });
    expect(examples.map((example) => example.style)).toEqual(["number", "photo", "statement"]);
    expect(examples[0]).toMatchObject({ title: "2", sub: "plants need water", tone: "warn" });
  });
});

describe("Hero fallback and metadata", () => {
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Hero");
    expect(registry.schema("Hero")).toBe(props);
    expect(registry.resolve("h-e-r-o")).toBe("Hero");
    expect(registry.resolve("h-e-r-o")).toBe("Hero");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
  it("reads the headline and detail without offering actions, including while loading", () => {
    expect(readComponent(components.Hero, examples[0], "h1")).toEqual([
      'h1 Hero[number][warn] "2" — "plants need water"',
    ]);
    for (const example of examples) {
      const parsed = props.parse(example);
      expect(affordancesOf(meta, parsed, "h1")).toEqual([]);
      expect(readComponent(components.Hero, example, "h1", "loading")).toHaveLength(1);
      expect(readComponent(components.Hero, example, "h1", "loading")[0]).not.toContain('"');
    }
  });
  it.each([undefined, "local-photo-uri"])("draws wide media only when the host resolves it: %s", (source) => {
    const resolvePhoto = vi.fn(() => source);
    const html = renderInstance("Hero", examples[1], "filled", theme, { resolvePhoto });
    expect(html.includes('data-testid="home/c1/photo"')).toBe(Boolean(source));
    if (source) expect(styleAt(html, "home/c1/photo")).toMatch(/aspect-ratio:\s*1\.777/);
    expect(elementAt(html, "home/c1/title").attributes).toContain('data-testid="home/c1/title"');
    expect(resolvePhoto).toHaveBeenCalledWith("lib:dogs");
  });
});
