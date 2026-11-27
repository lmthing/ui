import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  placeholderDetail,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Empty;

describe("Empty schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and leaves optional fields absent", () => {
    const derived = { detail: "full", kind: "none", retryable: false };
    expect(props.parse({ title: "  Nothing here yet  " })).toEqual({ ...derived, title: "Nothing here yet" });
    expect(props.parse({ title: "  Nothing here yet  ", sub: "  Details  ", icon: "info" })).toEqual({
      ...derived,
      title: "Nothing here yet",
      sub: "Details",
      icon: "info",
    });
  });
  it.each([
    {},
    { title: "" },
    { title: " ".repeat(4) },
    { title: "a".repeat(41) },
    { title: 4 },
    { title: "Nothing here yet", sub: "" },
    { title: "Nothing here yet", sub: " ".repeat(4) },
    { title: "Nothing here yet", sub: "a".repeat(101) },
    { title: "Nothing here yet", sub: 4 },
    { title: "Nothing here yet", icon: "unknown" },
    { title: "Nothing here yet", style: "plain" },
    { title: "Nothing here yet", detail: "minimal" },
    { title: "Nothing here yet", color: "red" },
    { title: "Nothing here yet", pixels: 4 },
    { title: "Nothing here yet", id: "e1" },
    { title: "Nothing here yet", goto: "next" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum lengths", () => {
    expect(props.safeParse({ title: "a".repeat(40), sub: "a".repeat(100), icon: "leaf" }).success).toBe(true);
  });
  it("types view props without validator item ids", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["title"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["sub"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

it("brief hides only the explanation and preserves the retry action and its address", () => {
  const input = {
    title: "Couldn't load",
    sub: "Check your connection.",
    kind: "offline",
    detail: "brief",
  } as const;
  const html = renderInstance("Empty", input, "filled", { preset: "calm", mode: "light", accent: "moss" });
  expect(meta.variantParts["detail.brief"]).toEqual({ hides: ["sub"] });
  expect(html).toContain('data-testid="home/c1/title"');
  expect(html).toContain('data-testid="home/c1/retry"');
  expect(html).not.toContain('data-testid="home/c1/sub"');
  expect(readComponent(components.Empty, input, "c1").join(" ")).not.toContain(input.sub);
  expect(affordancesOf(meta, props.parse(input), "c1").map(({ address }) => address)).toEqual(["c1/retry"]);
});

describe("Empty fallback", () => {
  it("validates empty, matching, mixed and malformed casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [{ type: "entry", fields: ["heading"] }], items: [] },
      {
        things: [
          { type: "category", fields: [] },
          { type: "entry", fields: [] },
        ],
        items: [{ id: "first", type: "entry", sample: true, heading: "First" }],
      },
      {
        things: [],
        items: [{ id: "first", type: "entry", sample: true, heading: 4 }],
      },
      { things: [{ type: "  ", fields: [] }], items: [] },
      { things: [{ type: "x".repeat(80), fields: [] }], items: [] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({
      title: emptyLine(),
      sub: placeholderDetail,
    });
    expect(fallback({ cast: casts[1]! }).title).toBe("No entries yet");
    expect(fallback({ cast: casts[2]! }).title).toBe("No categories yet");
    expect(fallback({ cast: casts[3]! }).title).toBe(emptyLine());
    expect(fallback({ cast: casts[4]! }).title).toBe(emptyLine());
    expect(fallback({ cast: casts[5]! }).title).toHaveLength(40);
  });
  it.each([
    ["storage_box", "No storage boxes yet"],
    ["address", "No addresses yet"],
    [" CATEGORY ", "No categories yet"],
    ["entry", "No entries yet"],
  ])("uses shared empty copy for %s", (type, title) => {
    expect(fallback({ cast: { things: [{ type, fields: [] }], items: [] } })).toEqual({
      title,
      sub: placeholderDetail,
    });
  });
});

it.each(examples.slice(-3))("announces $title without offering retry", (input) => {
  const html = renderInstance("Empty", input, "filled", { preset: "calm", mode: "light", accent: "moss" });
  expect(html).toContain('role="status"');
  expect(html).not.toContain('data-testid="home/c1/retry"');
  expect(affordancesOf(meta, props.parse(input), "c1")).toEqual([]);
  expect(readComponent(components.Empty, input, "c1").join(" ")).toContain(input.title);
});

describe("Empty metadata and probes", () => {
  it("has the required metadata and well-formed choose and write probes", () => {
    expect(meta).toMatchObject({
      id: "Empty",
      group: "content",
      region: "body",
      weight: 2,
      tier: "phone",
      parts: ["root", "icon", "title", "sub", "retry"],
      states: ["filled"],
    });
    expect(meta).not.toHaveProperty("items");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Hero");
    expect(meta.pick).toContain("Banner");
    expect(meta.pick).toContain("Note");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Empty")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Hero")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Empty" });
    expect(probes.map((probe) => probe.kind)).not.toContain("read");
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.brief;
      for (const name of [meta.id, "Hero", "Note"])
        expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
    expect(examples.some((example) => "icon" in example)).toBe(true);
    expect(examples.some((example) => "sub" in example)).toBe(true);
  });
  it("keeps the near miss about one main number with supporting text", () => {
    const nearMiss = probes.find((probe) => probe.kind === "choose" && probe.expect === "Hero");
    expect(nearMiss).toMatchObject({
      kind: "choose",
      need: "At the top of my plant screen, show 2 as the main headline count with plants need water today underneath. It counts plants, not money.",
      expect: "Hero",
    });
    if (nearMiss?.kind !== "choose") throw new Error("Missing main-number near miss");
    for (const component of [components.Empty, components.Hero, components.Banner])
      for (const name of [component.meta.id])
        expect(nearMiss.need).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Empty");
    expect(registry.schema("Empty")).toBe(props);
    expect(registry.resolve("e-m-p-t-y")).toBe("Empty");
    expect(registry.resolve("e-m-p-t-y")).toBe("Empty");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});
