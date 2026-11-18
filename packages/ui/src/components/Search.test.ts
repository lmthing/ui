import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";
import { Search } from "./Search";

const { props, meta, examples, fallback, probes } = components.Search;

describe("Search schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims the placeholder", () => {
    expect(props.parse({ hint: "  Search records  " })).toEqual({ hint: "Search records" });
  });
  it.each([
    {},
    { hint: "" },
    { hint: " ".repeat(4) },
    { hint: "a".repeat(41) },
    { hint: 4 },
    { hint: null },
    { hint: "Search", color: "red" },
    { hint: "Search", pixels: 4 },
    { hint: "Search", style: "large" },
    { hint: "Search", value: "record" },
    { hint: "Search", icon: "search" },
    { hint: "Search", id: "s1" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum length", () => {
    expect(props.safeParse({ hint: "a".repeat(40) }).success).toBe(true);
  });
  it("infers view props without item ids or visual values", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["hint"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
  });
});

describe("Search fallback and metadata", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "record", fields: ["name"] }],
        items: [{ id: "first", type: "record", sample: true, name: "First" }],
      },
      { things: [], items: [{ id: "first", type: "entry", sample: true, name: "First" }] },
      {
        things: [
          { type: "daily_entry", fields: ["name"] },
          { type: "record", fields: [] },
        ],
        items: [{ id: "first", type: "daily_entry", sample: true, name: 4 }],
      },
      { things: [{ type: "x".repeat(80), fields: [] }], items: [] },
      { things: [{ type: "___", fields: [] }], items: [] },
      { things: [{ type: "  TASK-ENTRY  ", fields: [] }], items: [] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).hint).toBe("Search");
    expect(fallback({ cast: casts[1]! }).hint).toBe("Search records");
    expect(fallback({ cast: casts[2]! }).hint).toBe("Search");
    expect(fallback({ cast: casts[3]! }).hint).toBe("Search daily entries");
    expect(fallback({ cast: casts[4]! }).hint).toBe(`Search ${"x".repeat(33)}`);
    expect(fallback({ cast: casts[5]! }).hint).toBe("Search");
    expect(fallback({ cast: casts[6]! }).hint).toBe("Search task entries");
  });
  it.each([
    ["entry", "entries"],
    ["box", "boxes"],
    ["class", "classes"],
    ["match", "matches"],
    ["key", "keys"],
  ])("uses the shared plural for %s", (type, plural) => {
    expect(fallback({ cast: { things: [{ type, fields: [] }], items: [] } })).toEqual({
      hint: `Search ${plural}`,
    });
  });
  it("has the required parts, tier, real path and well-formed probes", () => {
    expect(meta).toMatchObject({
      id: "Search",
      group: "input",
      region: "top",
      weight: 1,
      tier: "phone",
    });
    expect(meta.parts).toEqual(["root", "field"]);
    expect(meta.states).toEqual(["filled"]);
    expect(meta.actions).toEqual({ parts: { field: ["type"] } });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Chips");
    expect(meta.pick).toContain("Field");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Chips")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Search" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Look for the fern",
      expect: { address: "s1/field", action: "type" },
    });
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Search");
    expect(registry.schema("Search")).toBe(props);
    expect(registry.resolve("s-e-a-r-c-h")).toBe("Search");
    expect(registry.resolve("s-e-a-r-c-h")).toBe("Search");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

describe("Search view", () => {
  it("keeps the surface-free root flush with the screen gutter", () => {
    expect(Search({ hint: "Search records" }).props).toMatchObject({
      label: "Search records",
      inset: "none",
    });
  });
  it.each([...examples, { hint: "a".repeat(40) }])(
    "offers type only on the rendered search field",
    (input) => {
      const html = renderInstance("Search", input, "filled", {
        preset: "calm",
        mode: "light",
        accent: "moss",
      });
      const read = readComponent(components.Search, input, "c1").join("\n");
      expect(
        affordancesOf(meta, props.parse(input), "c1").map(({ address, part, action }) => ({
          address,
          part,
          action,
        })),
      ).toEqual([{ address: "c1/field", part: "field", action: "type" }]);
      const tag = html.match(/<input[^>]*data-testid="home\/c1\/field"[^>]*>/)?.[0];
      expect(tag).toContain('role="searchbox"');
      expect(tag).toContain(`placeholder="${input.hint}"`);
      expect(tag).toContain(`aria-label="${input.hint}"`);
      expect(tag).toContain("readOnly");
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      expect(html.match(/data-testid="home\/c1\/field"/g)).toHaveLength(1);
      expect(html).not.toContain('role="list"');
      expect(html).not.toContain('role="listitem"');
      expect(read).toContain(input.hint);
      expect(read).toContain("[c1/field type");
    },
  );
});
