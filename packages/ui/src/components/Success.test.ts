import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  placeholderDetail,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { KitCard, KitEmpty } from "@lmthing/ui/kit";
import { Success } from "./Success";

const { props, meta, examples, fallback, probes } = components.Success;

describe("Success schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and defaults the optional icon to a check", () => {
    expect(props.parse({ title: "  Saved  " })).toEqual({ title: "Saved", icon: "circle_check" });
    expect(props.parse({ title: "  Saved  ", sub: "  Details  ", icon: "leaf" })).toEqual({
      title: "Saved",
      sub: "Details",
      icon: "leaf",
    });
    expect(props.parse({ title: "Saved", icon: undefined }).icon).toBe("circle_check");
  });
  it.each([
    {},
    { title: "" },
    { title: " ".repeat(4) },
    { title: "a".repeat(41) },
    { title: 4 },
    { title: "Saved", sub: "" },
    { title: "Saved", sub: " ".repeat(4) },
    { title: "Saved", sub: "a".repeat(101) },
    { title: "Saved", sub: 4 },
    { title: "Saved", icon: "unknown" },
    { title: "Saved", icon: null },
    { title: "Saved", style: "plain" },
    { title: "Saved", tone: "good" },
    { title: "Saved", color: "red" },
    { title: "Saved", pixels: 4 },
    { title: "Saved", id: "s1" },
    { title: "Saved", goto: "next" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum lengths", () => {
    expect(
      props.safeParse({ title: "a".repeat(40), sub: "a".repeat(100), icon: "circle_check" }).success,
    ).toBe(true);
  });
  it("types view props without validator item ids or presentation props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["title"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["sub"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps["icon"]>().not.toBeNullable();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expectTypeOf<ViewProps>().not.toHaveProperty("tone");
  });
});

describe("Success fallback", () => {
  it("validates empty, matching, mixed and malformed casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "entry", fields: ["heading", "detail"] }],
        items: [{ id: "first", type: "entry", sample: true, heading: "First", detail: "Extra" }],
      },
      {
        things: [
          { type: "category", fields: ["label"] },
          { type: "entry", fields: ["heading"] },
        ],
        items: [
          { id: "first", type: "entry", sample: true, heading: "First" },
          { id: "second", type: "category", sample: true, label: "Second" },
        ],
      },
      { things: [], items: [{ id: "first", type: "entry", sample: true, heading: 4 }] },
      { things: [], items: [{ id: "first", type: "entry", sample: true, heading: "  " }] },
      {
        things: [],
        items: [{ id: "first", type: "entry", sample: false, heading: "x".repeat(140) }],
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({ title: "Saved", sub: placeholderDetail });
    expect(fallback({ cast: casts[1]! })).toEqual({ title: "Saved", sub: "First" });
    expect(fallback({ cast: casts[2]! }).sub).toBe("First");
    expect(fallback({ cast: casts[3]! }).sub).toBe(placeholderDetail);
    expect(fallback({ cast: casts[4]! }).sub).toBe(placeholderDetail);
    expect(fallback({ cast: casts[5]! }).sub).toHaveLength(100);
  });
  it("uses declared fields, not guessed names or later items", () => {
    const cast: CastLike = {
      things: [{ type: "entry", fields: ["heading", "name"] }],
      items: [
        { id: "first", type: "entry", sample: true, name: "Ignored", heading: "  First  " },
        { id: "second", type: "entry", sample: true, heading: "Second" },
      ],
    };
    expect(fallback({ cast }).sub).toBe("First");
    cast.items[0] = { id: "first", type: "entry", sample: true, heading: 4 };
    expect(fallback({ cast }).sub).toBe(placeholderDetail);
  });
});

describe("Success metadata and probes", () => {
  it("has the required metadata and well-formed choose and write probes", () => {
    expect(meta).toMatchObject({
      id: "Success",
      group: "action",
      region: "body",
      weight: 2,
      tier: "phone",
      parts: ["root", "icon", "title", "sub"],
      states: ["filled"],
    });
    expect(meta).not.toHaveProperty("actions");
    expect(meta).not.toHaveProperty("items");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Banner");
    expect(meta.pick).toContain("Empty");
    expect(meta.aliases).toHaveLength(3);
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Success")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Banner")).toBeDefined();
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(1);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Success" });
    expect(probes.map((probe) => probe.kind)).not.toContain("read");
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.brief;
      for (const name of [meta.id, "Banner", "Empty", ...meta.aliases])
        expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
    expect(examples[0]!.title).toBe("Fern watered");
    expect(examples[1]).toEqual({ title: "Walk booked", sub: "Clover, tomorrow at 09:00" });
    expect(examples.some((example) => "icon" in example)).toBe(true);
  });
  it("builds a data-only registry with case and separator tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Success");
    expect(registry.schema("Success")).toBe(props);
    expect(registry.resolve("CONFIRMATION")).toBe("Success");
    expect(registry.resolve("com-pleted")).toBe("Success");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

describe("Success view", () => {
  it.each(examples)("draws the centred good-toned kit state with a root address", (example) => {
    const parsed = props.parse(example);
    const view = Success(parsed);
    expect(view.type).toBe(KitCard);
    expect(view.props).toMatchObject({ style: "plain", part: "root" });
    expect(view.props.children.type).toBe(KitEmpty);
    expect(view.props.children.props).toEqual({ ...parsed, fill: true, tone: "good" });
  });
  it.each(examples)("reads the shown content without offering actions", (example) => {
    const parsed = props.parse(example);
    const read = readComponent(components.Success, parsed, "s1").join("\n");
    expect(read).toContain(`"${parsed.title}"`);
    if (parsed.sub) expect(read).toContain(`"${parsed.sub}"`);
    expect(affordancesOf(meta, parsed, "s1")).toEqual([]);
  });
});
