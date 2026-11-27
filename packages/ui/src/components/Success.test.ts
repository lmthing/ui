import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  affordancesOf,
  placeholderDetail,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

import { Success } from "./Success";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Success;

describe("Success schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and defaults the optional icon to a check", () => {
    const derived = { style: "screen", detail: "full", undo: false, undoable: false, sub: undefined };
    expect(props.parse({ title: "  Saved  " })).toEqual({ ...derived, title: "Saved", icon: "circle_check" });
    expect(props.parse({ title: "  Saved  ", sub: "  Details  ", icon: "leaf" })).toEqual({
      ...derived,
      title: "Saved",
      sub: "Details",
      icon: "leaf",
    });
    expect(props.parse({ title: "Saved", icon: undefined }).icon).toBe("circle_check");
  });
  it.each([
    { title: "Saved", undoable: true },
    { title: "Saved", style: "banner" },
    { title: "Saved", detail: "short" },
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
      parts: ["root", "icon", "title", "sub", "owner", "next", "subject", "when", "receipt", "undo", "close"],
      states: ["filled"],
    });
    expect(meta).not.toHaveProperty("items");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Banner");
    expect(meta.pick).toContain("Empty");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Success")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Banner")).toBeDefined();
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(4);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Success" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      expect: { address: "s1/undo", action: "press" },
    });
    for (const probe of probes) {
      const wording =
        probe.kind === "choose" ? probe.need : probe.kind === "write" ? probe.brief : probe.task;
      for (const name of [meta.id, "Banner", "Empty"])
        expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
    expect(examples[0]!.title).toBe("Fern watered");
    expect(examples[1]).toEqual({ title: "Walk booked", sub: "Clover, tomorrow at 09:00" });
    expect(examples.some((example) => "icon" in example)).toBe(true);
    expect(examples.some((example) => "style" in example && example.style === "toast")).toBe(true);
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Success");
    expect(registry.schema("Success")).toBe(props);
    expect(registry.resolve("s-u-c-c-e-s-s")).toBe("Success");
    expect(registry.resolve("s-u-c-c-e-s-s")).toBe("Success");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

it.each(["screen", "toast"] as const)("brief hides sub but preserves %s actions", (style) => {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  const input = { title: "Saved", sub: "Morning light", style, undo: style === "toast" };
  const brief = { ...input, detail: "brief" };
  expect(meta.variantParts["detail.brief"].hides).toEqual(["sub"]);
  expect(renderInstance("Success", input, "filled", theme)).toContain('data-testid="home/c1/sub"');
  expect(renderInstance("Success", brief, "filled", theme)).not.toContain('data-testid="home/c1/sub"');
  expect(readComponent(components.Success, brief, "s1").join("\n")).not.toContain(input.sub);
  expect(affordancesOf(meta, props.parse(brief), "s1")).toEqual(
    affordancesOf(meta, props.parse(input), "s1"),
  );
});
