import { describe, expect, expectTypeOf, it } from "vitest";
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
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Profile;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Profile schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  // prettier-ignore
  it("applies defaults and trims text", () => {
    const finish = { align: "start", detail: "full", media: "thumb" };
    expect(props.parse({ name: "  Monstera  " })).toEqual({ ...finish, name: "Monstera" });
    expect(props.parse({ name: " Clover ", meta: " Beagle · 4 years ", photo: "lib:dogs" }))
      .toEqual({ ...finish, name: "Clover", meta: "Beagle · 4 years", photo: "lib:dogs" });
  });
  it.each([
    {},
    { name: "" },
    { name: " ".repeat(4) },
    { name: 4 },
    { name: "a".repeat(33) },
    { name: "Clover", meta: "" },
    { name: "Clover", meta: " ".repeat(4) },
    { name: "Clover", meta: 4 },
    { name: "Clover", meta: "a".repeat(49) },
    { name: "Clover", photo: "https://example.org/image.png" },
    { name: "Clover", photo: `lib:${"a".repeat(61)}` },
    { name: "Clover", photo: "local:dog" },
    { name: "Clover", photo: "" },
    { name: "Clover", style: "grid" },
    { name: "Clover", align: "centered" },
    { name: "Clover", media: "cover" },
    { name: "Clover", color: "red" },
    { name: "Clover", pixels: 4 },
    { name: "Clover", goto: "clover" },
    { name: "Clover", id: "p1" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact maximum lengths and reference forms at either alignment", () => {
    for (const align of ["start", "center"]) {
      expect(
        props.safeParse({
          align,
          name: "a".repeat(32),
          meta: "a".repeat(48),
          photo: `lib:${"a".repeat(60)}`,
        }).success,
      ).toBe(true);
      expect(props.safeParse({ align, name: "Clover", photo: "local:1" }).success).toBe(true);
    }
  });
  it("infers view props without item ids, actions or visual controls", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["name"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["meta"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps["photo"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps["align"]>().toEqualTypeOf<"start" | "center">();
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
    items: [{ id: "monstera", type: "plant", sample: true, name: "Monstera", room: "Living room" }],
  },
  {
    things: [{ type: "plant", fields: ["name", "room"] }],
    items: [
      { id: "dog", type: "dog", sample: true, title: "Clover", detail: "Beagle · 4 years" },
      { id: "plant", type: "plant", sample: true, name: "Monstera", room: "Living room" },
    ],
  },
  {
    things: [{ type: "item", fields: ["summary", "detail", "name"] }],
    items: [
      { id: "one", type: "item", sample: false, name: "Not first", summary: " First ", detail: " Second " },
    ],
  },
  {
    things: [{ type: "item", fields: ["name", "detail"] }],
    items: [{ id: "one", type: "item", sample: false, name: "x".repeat(80), detail: "y".repeat(100) }],
  },
  { things: [], items: [{ id: "one", type: "item", sample: true, name: 4 }] },
  { things: [], items: [{ id: "one", type: "item", sample: false, title: "Only a name" }] },
  {
    things: [],
    items: [
      { id: "one", type: "item", sample: false, title: " " },
      { id: "two", type: "item", sample: false, title: "Do not skip ahead" },
    ],
  },
];

describe("Profile fallback and metadata", () => {
  it("uses the first cast item, declared fields and shared neutral placeholders", () => {
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    const neutral = { name: placeholderTitle(0), meta: placeholderDetail };
    expect(fallback({ cast: casts[0]! })).toEqual(neutral);
    expect(fallback({ cast: casts[1]! })).toEqual({ name: "Monstera", meta: "Living room" });
    expect(fallback({ cast: casts[2]! })).toEqual({ name: "Clover", meta: "Beagle · 4 years" });
    expect(fallback({ cast: casts[3]! })).toEqual({ name: "First", meta: "Second" });
    expect(fallback({ cast: casts[4]! })).toEqual({
      name: "x".repeat(32),
      meta: "y".repeat(48),
    });
    expect(fallback({ cast: casts[5]! })).toEqual(neutral);
    expect(fallback({ cast: casts[6]! })).toEqual({
      name: "Only a name",
      meta: placeholderDetail,
    });
    expect(fallback({ cast: casts[7]! })).toEqual(neutral);
  });
  it("has the required metadata and two choose probes with a near miss plus one write", () => {
    expect(meta).toMatchObject({ id: "Profile", group: "content", region: "top", weight: 2, tier: "phone" });
    expect(meta.parts).toEqual(["root", "photo", "name", "meta"]);
    expect(meta.states).toEqual(["filled", "loading"]);
    expect(meta).not.toHaveProperty("actions");
    expect(meta).not.toHaveProperty("items");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Header");
    expect(meta.pick).toContain("Card");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Profile")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Header")).toBeDefined();
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Profile" });
    expect(props.parse(examples[1]).align).toBe("center");
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Profile");
    expect(registry.schema("Profile")).toBe(props);
    expect(registry.resolve("p-r-o-f-i-l-e")).toBe("Profile");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

describe("Profile view", () => {
  it.each(meta.variants.align)("preserves photo, name and meta addresses at %s alignment", (align) => {
    for (const optional of [
      {},
      { meta: "Beagle · 4 years" },
      { photo: "lib:dogs" },
      { meta: "Beagle · 4 years", photo: "local:1" },
    ]) {
      const input = { align, name: "Clover", ...optional };
      const parsed = props.parse(input);
      const html = renderInstance("Profile", input, "filled", theme);
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      expect(html).toContain('data-testid="home/c1/name"');
      expect(html.includes('data-testid="home/c1/meta"')).toBe(Boolean(parsed.meta));
      expect(html).toContain('data-testid="home/c1/photo"');
      expect(html.includes('role="img"')).toBe(Boolean(parsed.photo));
      if (parsed.photo) expect(html).toContain('aria-label="Clover"');
      expect(html).not.toContain('role="button"');
      expect(html).not.toContain('role="link"');
      expect(affordancesOf(meta, parsed, "c1")).toEqual([]);
      const read = readComponent(components.Profile, input, "c1").join("\n");
      expect(read).toContain('"Clover"');
      if (parsed.meta) expect(read).toContain(parsed.meta);
      expect(read).not.toContain(" press");
    }
  });
  it.each(meta.variants.align)("shows a loading skeleton without stale identity parts: %s", (align) => {
    const input = { align, name: "Clover", meta: "Beagle · 4 years", photo: "lib:dogs" };
    const html = renderInstance("Profile", input, "loading", theme);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("Clover");
    for (const part of ["name", "meta", "photo"]) expect(html).not.toContain(`data-testid="home/c1/${part}"`);
    const read = readComponent(components.Profile, input, "c1", "loading");
    expect(read).toEqual(["c1 Profile (loading)"]);
  });
});

it("hides only the declared content parts and supporting reading", () => {
  const input = { ...examples[0], detail: "brief", media: "none" };
  const html = renderInstance("Profile", input, "filled", theme);
  for (const { hides } of Object.values(meta.variantParts))
    for (const part of hides) expect(html).not.toContain(`data-testid="home/c1/${part}"`);
  expect(html).toContain('data-testid="home/c1/name"');
  expect(readComponent(components.Profile, input, "p1").join("\n")).not.toContain(examples[0]!.meta);
});
