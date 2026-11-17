import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { KitChip, KitTrack } from "@lmthing/ui/kit";
import { Chips } from "./Chips";

const { props, meta, examples, fallback, probes } = components.Chips;

describe("Chips schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims labels", () => {
    expect(props.parse({ items: [{ label: " One " }, { label: " Two " }] })).toEqual({
      style: "filter",
      items: [
        { label: "One", on: false },
        { label: "Two", on: false },
      ],
    });
  });
  it.each([
    {},
    { items: [] },
    { items: [{ label: "One" }] },
    { items: Array.from({ length: 7 }, () => ({ label: "One" })) },
    ...["", " ", "a".repeat(17), 4].map((label) => ({ items: [{ label }, { label: "Two" }] })),
    ...["unknown", null].map((icon) => ({ items: [{ label: "One", icon }, { label: "Two" }] })),
    ...["true", 1, null].map((on) => ({ items: [{ label: "One", on }, { label: "Two" }] })),
    { style: "tabs", items: [{ label: "One" }, { label: "Two" }] },
    { color: "red", items: [{ label: "One" }, { label: "Two" }] },
    ...["id", "pixels", "root", "style"].map((key) => ({
      items: [{ label: "One", [key]: "one" }, { label: "Two" }],
    })),
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact limits and independent filters, but at most one chosen value", () => {
    const items = Array.from({ length: 6 }, () => ({ label: "a".repeat(16), on: true, icon: "leaf" }));
    expect(props.safeParse({ items }).success).toBe(true);
    expect(props.safeParse({ style: "choose", items }).success).toBe(false);
    for (const selected of [-1, 0, 5]) {
      const chosen = items.map((item, index) => ({ ...item, on: index === selected }));
      expect(props.safeParse({ style: "choose", items: chosen }).success).toBe(true);
    }
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["items"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["items"][number]["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"filter" | "choose">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Chips fallback", () => {
  it("validates empty, matching, mixed, excessive and malformed casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "entry", fields: ["heading", "name"] }],
        items: [{ id: "one", type: "entry", sample: true, heading: " First ", name: "Not first" }],
      },
      {
        things: [],
        items: [
          { id: "one", type: "entry", sample: true, title: "First" },
          { id: "two", type: "other", sample: true, title: "Wrong type" },
          { id: "three", type: "entry", sample: true, title: "Second" },
        ],
      },
      {
        things: [{ type: "entry", fields: ["heading"] }],
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `entry_${index}`,
          type: "entry",
          sample: false,
          heading: "x".repeat(80),
        })),
      },
      { things: [], items: [{ id: "one", type: "entry", sample: true, heading: 4 }] },
      { things: [{ type: "entry", fields: ["heading"] }], items: [] },
    ];
    for (const cast of casts) {
      const value = fallback({ cast });
      expect(props.safeParse(value).success).toBe(true);
      expect(value.items.filter((item) => item.on)).toHaveLength(1);
      expect(value.items[0]?.on).toBe(true);
    }
    expect(fallback({ cast: casts[0]! }).items.map((item) => item.label)).toEqual(["Item one", "Item two"]);
    expect(fallback({ cast: casts[1]! }).items[0]?.label).toBe("First");
    expect(fallback({ cast: casts[2]! }).items.map((item) => item.label)).toEqual(["First", "Second"]);
    expect(fallback({ cast: casts[3]! }).items).toHaveLength(6);
    expect(fallback({ cast: casts[3]! }).items[0]?.label).toBe("x".repeat(16));
    expect(fallback({ cast: casts[4]! })).toEqual(fallback({ cast: casts[0]! }));
  });
});

describe("Chips metadata and probes", () => {
  it("has the required contract and well-formed probes", () => {
    expect(meta).toMatchObject({ id: "Chips", group: "input", region: "body", weight: 1, tier: "phone" });
    expect(meta.items).toEqual({ key: "items", parts: ["root", "label"] });
    expect(meta.parts).toEqual(["root"]);
    expect(meta.states).toEqual(["filled"]);
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Segmented");
    expect(meta.pick).toContain("Checklist");
    expect(meta.aliases.length).toBeGreaterThanOrEqual(3);
    const choose = probes.filter((probe) => probe.kind === "choose");
    expect(choose.map((probe) => probe.expect)).toEqual(["Chips", "Segmented"]);
    for (const probe of choose)
      for (const name of [meta.id, "Segmented", "Checklist", ...meta.aliases])
        expect(probe.need).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Chips" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Show only kitchen plants",
      expect: { address: "c1/r3", action: "toggle" },
    });
    const registry = createRegistry();
    expect(registry.ids).toContain("Chips");
    expect(registry.schema("Chips")).toBe(props);
    expect(registry.resolve("FILTERS")).toBe("Chips");
    expect(registry.resolve("pills")).toBe("Chips");
  });
});

describe("Chips view and supported action declaration", () => {
  it.each(examples)("draws labeled pills with the style's accessible role", (example) => {
    const parsed = props.parse(example);
    const stamped = stampItemIds(meta, parsed) as Props<typeof props, typeof meta>;
    const view = Chips(stamped);
    expect(view.type).toBe(KitTrack);
    expect(view.props.look).toBe("pills");
    for (const [index, chip] of view.props.children.entries()) {
      expect(chip.type).toBe(KitChip);
      expect(chip.props).toMatchObject({
        ...parsed.items[index],
        item: `r${index + 1}`,
        look: "pill",
        role: example.style === "filter" ? "checkbox" : "radio",
      });
    }
    const read = readComponent(components.Chips, example, "c1").join("\n");
    for (const item of parsed.items) expect(read).toContain(item.label);
    // The shared metadata currently offers both actions, regardless of the component's style.
    expect(affordancesOf(meta, stamped, "c1")).toEqual(
      parsed.items.flatMap((item, index) => [
        { address: `c1/r${index + 1}`, part: "root", action: "toggle", detail: item.on ? ":on" : ":off" },
        { address: `c1/r${index + 1}`, part: "root", action: "select", detail: "" },
      ]),
    );
  });
});
