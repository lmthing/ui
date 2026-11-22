import { describe, expect, expectTypeOf, it } from "vitest";
import { renderInstance } from "../../test/render";
import {
  affordancesOf,
  components,
  createRegistry,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.Actions;
const item = { icon: "plus", label: "Continue", goto: "next_screen" };
const inputWith = (value: unknown) => ({ items: [item, value] });

describe("Actions schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("exercises every grid count in the examples", () => {
    expect(new Set(examples.map((example) => example.items.length))).toEqual(new Set([2, 3, 4]));
  });
  it("defaults to a grid on a card and trims labels", () => {
    expect(props.parse(inputWith({ ...item, label: "  Continue  " }))).toEqual({
      arrange: "grid",
      items: [item, item],
    });
  });
  it.each([
    {},
    { items: [] },
    { items: [item] },
    { items: Array.from({ length: 5 }, () => item) },
    { items: null },
    inputWith({ ...item, label: "" }),
    inputWith({ ...item, label: " ".repeat(4) }),
    inputWith({ ...item, label: "a".repeat(17) }),
    inputWith({ ...item, label: 4 }),
    inputWith({ ...item, icon: "unknown" }),
    inputWith({ label: "Continue", goto: "next_screen" }),
    inputWith({ icon: "plus", goto: "next_screen" }),
    inputWith({ icon: "plus", label: "Continue" }),
    inputWith({ ...item, goto: "" }),
    inputWith({ ...item, goto: "Bad ID" }),
    inputWith({ ...item, goto: "next-screen" }),
    inputWith({ ...item, goto: "a".repeat(65) }),
    inputWith({ ...item, goto: "https://example.org" }),
    inputWith({ ...item, color: "red" }),
    inputWith({ ...item, pixels: 4 }),
    inputWith({ ...item, id: "r2" }),
    { items: [item, item], style: "grid" },
    { items: [item, item], arrange: "circles" },
    { items: [item, item], surface: "tinted" },
    { items: [item, item], color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact maximum lengths, all counts and back navigation", () => {
    const longest = { icon: "calendar", label: "a".repeat(16), goto: "a".repeat(64) };
    for (const count of [2, 3, 4]) {
      expect(props.safeParse({ items: Array.from({ length: count }, () => longest) }).success).toBe(true);
    }
    expect(props.safeParse(inputWith({ ...item, goto: "back" })).success).toBe(true);
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["items"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["items"][number]["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["items"][number]["goto"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Actions fallback", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [
          { type: "calendar", fields: ["title"] },
          { type: "message", fields: ["text"] },
          { type: "user", fields: ["name"] },
        ],
        items: [{ id: "meeting", type: "calendar", sample: true, title: "Meeting" }],
      },
      { things: [{ type: "entry", fields: [] }], items: [] },
      {
        things: [
          { type: "a".repeat(80), fields: ["title"] },
          { type: "  ", fields: [] },
        ],
        items: [{ id: "entry", type: "entry", sample: true, title: 4 }],
      },
      { things: [{ type: "care_schedule", fields: [] }], items: [] },
      { things: [], items: [{ id: "entry", type: "entry", sample: true, title: "Entry" }] },
      {
        things: [
          { type: "___", fields: [] },
          { type: "--", fields: [] },
        ],
        items: [],
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).items).toEqual([
      { icon: "dot", label: "Item one", goto: "item_one" },
      { icon: "dot", label: "Item two", goto: "item_two" },
    ]);
    expect(fallback({ cast: casts[1]! }).items).toEqual([
      { icon: "calendar", label: "Calendar", goto: "calendar" },
      { icon: "message", label: "Message", goto: "message" },
    ]);
    expect(fallback({ cast: casts[2]! }).items[0]).toEqual({
      icon: "dot",
      label: "Entry",
      goto: "entry",
    });
    expect(fallback({ cast: casts[4]! }).items[0]?.label).toBe("Care schedule");
    expect(fallback({ cast: casts[6]! })).toEqual(fallback({ cast: casts[0]! }));
  });
});

describe("Actions addresses", () => {
  it("offers exactly one press action on every tile root", () => {
    for (const example of examples) {
      const parsed = stampItemIds(meta, props.parse(example));
      expect(affordancesOf(meta, parsed, "a1")).toEqual(
        example.items.map((item, index) => ({
          address: `a1/r${index + 1}`,
          part: "root",
          action: "press",
          detail: `→${item.goto}`,
        })),
      );
    }
  });
  it("preserves tile addresses when arranged as rows on a plain surface", () => {
    const input = examples[0]!;
    const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
    const base = renderInstance("Actions", input, "filled", theme);
    const rows = renderInstance("Actions", { ...input, arrange: "rows" }, "filled", theme);
    expect(rows.match(/data-testid="home\/[^"]+"/g)).toEqual(base.match(/data-testid="home\/[^"]+"/g));
    expect(rows.match(/role="link"/g)).toHaveLength(input.items.length);
  });
});
describe("Actions metadata and probes", () => {
  it("has the declared region, parts, state, actions, tier and real path", () => {
    expect(meta).toMatchObject({
      id: "Actions",
      group: "action",
      region: "body",
      weight: 2,
      tier: "phone",
      items: { key: "items", parts: ["root", "icon", "label"] },
      states: ["filled"],
      actions: { items: { root: ["press"] } },
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Button");
    expect(meta.pick).toContain("List");
  });
  it("has well-formed choose, write and read probes", () => {
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Actions")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Button")).toBeDefined();
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Actions" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Add a plant",
      expect: { address: "a1/r2", action: "press" },
    });
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Actions");
    expect(registry.schema("Actions")).toBe(props);
    expect(registry.resolve("a-c-t-i-o-n-s")).toBe("Actions");
    expect(registry.resolve("a-c-t-i-o-n-s")).toBe("Actions");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});
