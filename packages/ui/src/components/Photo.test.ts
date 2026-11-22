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
import { elementAt, renderInstance, styleAt } from "../../test/render";
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const { props, meta, examples, fallback, probes } = components.Photo;

describe("Photo schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims the optional caption", () => {
    expect(props.parse({ photo: "lib:entry", caption: "  Morning light  " })).toEqual({
      aspect: "wide",
      detail: "full",
      photo: "lib:entry",
      caption: "Morning light",
    });
    expect(props.parse({ photo: "local:1" }).aspect).toBe("wide");
  });
  it.each([
    {},
    { caption: "Missing reference" },
    { photo: "" },
    { photo: 4 },
    { photo: "https://example.org/image.png" },
    { photo: "lib:Bad ID" },
    { photo: `lib:${"a".repeat(61)}` },
    { photo: "local:0" },
    { photo: "local:entry" },
    { photo: "lib:entry", caption: "" },
    { photo: "lib:entry", caption: " ".repeat(4) },
    { photo: "lib:entry", caption: "a".repeat(81) },
    { photo: "lib:entry", caption: 4 },
    { photo: "lib:entry", style: "round" },
    { photo: "lib:entry", aspect: "round" },
    { photo: "lib:entry", bleed: "full" },
    { photo: "lib:entry", ratio: "wide" },
    { photo: "lib:entry", color: "red" },
    { photo: "lib:entry", pixels: 4 },
    { photo: "lib:entry", goto: "next" },
    { photo: "lib:entry", id: "p1" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact limits, every aspect and both reference forms", () => {
    for (const aspect of ["square", "wide", "tall"])
      for (const photo of [`lib:${"a".repeat(60)}`, `local:${"1".repeat(58)}`])
        expect(props.safeParse({ aspect, photo, caption: "a".repeat(80) }).success).toBe(true);
  });
  it("types view props without item ids or visual controls", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["photo"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["caption"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps["aspect"]>().toEqualTypeOf<"square" | "wide" | "tall">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "entry", fields: ["heading", "detail"] }],
    items: [{ id: "one", type: "entry", sample: true, heading: "First", detail: "Details" }],
  },
  {
    things: [
      { type: "entry", fields: ["heading"] },
      { type: "other", fields: ["name"] },
    ],
    items: [
      { id: "one", type: "other", sample: true, name: "First item" },
      { id: "two", type: "entry", sample: true, heading: "Not first" },
    ],
  },
  {
    things: [{ type: "entry", fields: ["heading"] }],
    items: [{ id: "one", type: "entry", sample: false, heading: "x".repeat(160) }],
  },
  {
    things: [{ type: "Bad ID", fields: ["heading"] }],
    items: [{ id: "one", type: "Bad ID", sample: true, heading: 4 }],
  },
];

describe("Photo fallback", () => {
  it("validates empty, full, mixed and malformed casts using neutral placeholders", () => {
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    const expected = [
      { photo: "lib:item_one", caption: placeholderTitle(0) },
      { photo: "lib:entry", caption: "First" },
      { photo: "lib:entry", caption: "First item" },
    ];
    expected.forEach((value, index) => expect(fallback({ cast: casts[index]! })).toEqual(value));
    expect(fallback({ cast: casts[3]! }).caption).toBe("x".repeat(80));
    expect(fallback({ cast: casts[4]! })).toEqual(fallback({ cast: casts[0]! }));
  });
  it("uses field order, clips at word boundaries and never skips the first item", () => {
    const cast: CastLike = {
      things: [{ type: "entry", fields: ["heading", "name"] }],
      items: [
        {
          id: "one",
          type: "entry",
          sample: true,
          name: "Not first",
          heading: `${"a".repeat(75)} longerword`,
        },
      ],
    };
    expect(fallback({ cast }).caption).toBe("a".repeat(75));
    cast.items = [
      { id: "one", type: "entry", sample: true, heading: 4 },
      { id: "two", type: "entry", sample: true, heading: "Do not skip ahead" },
    ];
    expect(fallback({ cast }).caption).toBe(placeholderTitle(0));
  });
});

describe("Photo metadata and probes", () => {
  it("has the required contract and well-formed choose and write probes", () => {
    expect(meta).toMatchObject({
      id: "Photo",
      group: "content",
      region: "body",
      weight: 2,
      tier: "phone",
      parts: ["root", "photo", "caption"],
      states: ["filled", "loading"],
    });
    expect(meta).not.toHaveProperty("actions");
    expect(meta).not.toHaveProperty("items");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Gallery");
    expect(meta.pick).toContain("Hero");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Photo")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Gallery")).toBeDefined();
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Photo" });
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.brief;
      for (const name of [meta.id, "Gallery", "Hero"])
        expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
    const aspects = examples.map((example) => props.parse(example).aspect);
    expect(aspects).toEqual(["wide", "wide", "square", "tall", "wide", "wide", "wide"]);
    expect(examples.at(-1)).not.toHaveProperty("caption");
  });
  it("registers case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.schema("Photo")).toBe(props);
    expect(registry.resolve("p-h-o-t-o")).toBe("Photo");
  });
});

describe("Photo view", () => {
  it.each(examples)("draws one themed image and only the supplied caption", (example) => {
    const html = renderInstance("Photo", example, "filled", theme);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(elementAt(html, "home/c1/photo").attributes).toContain('role="img"');
    const { aspect, caption } = props.parse(example);
    const ratio = aspect === "wide" ? 16 / 9 : aspect === "tall" ? 3 / 4 : 1;
    expect(styleAt(html, "home/c1/photo")).toContain(`aspect-ratio:${ratio}`);
    expect(html.includes('data-testid="home/c1/caption"')).toBe(Boolean(caption));
    if (caption) expect(html).toContain(caption);
    expect(affordancesOf(meta, props.parse(example), "p1")).toEqual([]);
  });
  it.each(examples)("draws the media skeleton without exposing filled content", (example) => {
    const html = renderInstance("Photo", example, "loading", theme);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('data-testid="home/c1/photo"');
    expect(html).not.toContain('data-testid="home/c1/caption"');
    expect(readComponent(components.Photo, example, "p1", "loading")[0]).toContain("(loading)");
  });
});

it("hides the caption part and its reading only in brief", () => {
  const input = { photo: "lib:entry", caption: "Morning light" };
  expect(meta.variantParts["detail.brief"].hides).toEqual(["caption"]);
  expect(renderInstance("Photo", { ...input, detail: "brief" }, "filled", theme)).not.toContain(
    'data-testid="home/c1/caption"',
  );
  expect(readComponent(components.Photo, input, "p1").join("\n")).toContain(input.caption);
  expect(readComponent(components.Photo, { ...input, detail: "brief" }, "p1").join("\n")).not.toContain(
    input.caption,
  );
});
