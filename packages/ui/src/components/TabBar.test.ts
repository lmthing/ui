import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.TabBar;
const tab = { icon: "calendar", label: "Schedule", goto: "schedule" };
const inputWith = (value: unknown) => ({ tabs: [tab, value] });

describe("TabBar schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults to the first tab and trims labels", () => {
    expect(props.parse(inputWith({ ...tab, label: "  Schedule  " }))).toEqual({
      tabs: [tab, tab],
      at: 0,
    });
  });
  it.each([
    {},
    { tabs: [] },
    { tabs: [tab] },
    { tabs: Array.from({ length: 6 }, () => tab) },
    { tabs: null },
    inputWith({ ...tab, label: "" }),
    inputWith({ ...tab, label: " ".repeat(4) }),
    inputWith({ ...tab, label: "a".repeat(13) }),
    inputWith({ ...tab, label: 4 }),
    inputWith({ ...tab, icon: "unknown" }),
    inputWith({ label: "Schedule", goto: "schedule" }),
    inputWith({ icon: "calendar", goto: "schedule" }),
    inputWith({ icon: "calendar", label: "Schedule" }),
    inputWith({ ...tab, goto: "" }),
    inputWith({ ...tab, goto: "Bad ID" }),
    inputWith({ ...tab, goto: "next-screen" }),
    inputWith({ ...tab, goto: "a".repeat(65) }),
    inputWith({ ...tab, goto: "https://example.org" }),
    inputWith({ ...tab, color: "red" }),
    inputWith({ ...tab, pixels: 4 }),
    inputWith({ ...tab, id: "r2" }),
    { ...inputWith(tab), at: -1 },
    { ...inputWith(tab), at: 0.5 },
    { ...inputWith(tab), at: 2 },
    { ...inputWith(tab), at: "0" },
    { ...inputWith(tab), at: null },
    { ...inputWith(tab), style: "grid" },
    { ...inputWith(tab), color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact maximum lengths, every count and every valid selection", () => {
    const longest = { icon: "calendar", label: "a".repeat(12), goto: "a".repeat(64) };
    for (const count of [2, 3, 4, 5]) {
      const tabs = Array.from({ length: count }, () => longest);
      for (let at = 0; at < count; at++) expect(props.safeParse({ tabs, at }).success).toBe(true);
      expect(props.safeParse({ tabs, at: count }).success).toBe(false);
    }
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["tabs"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["tabs"][number]["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["tabs"][number]["goto"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["at"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("TabBar fallback", () => {
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
    for (const cast of casts) {
      const value = fallback({ cast });
      expect(props.safeParse(value).success).toBe(true);
      expect(value.tabs).toHaveLength(2);
      expect(value.at).toBe(0);
    }
    expect(fallback({ cast: casts[0]! }).tabs).toEqual([
      { icon: "dot", label: "Item one", goto: "item_one" },
      { icon: "dot", label: "Item two", goto: "item_two" },
    ]);
    expect(fallback({ cast: casts[1]! }).tabs).toEqual([
      { icon: "calendar", label: "Calendar", goto: "calendar" },
      { icon: "message", label: "Message", goto: "message" },
    ]);
    expect(fallback({ cast: casts[2]! }).tabs[0]).toEqual({
      icon: "dot",
      label: "Entry",
      goto: "entry",
    });
    expect(fallback({ cast: casts[4]! }).tabs[0]?.label).toBe("Care schedul");
    expect(fallback({ cast: casts[6]! })).toEqual(fallback({ cast: casts[0]! }));
  });
});

describe("TabBar metadata and probes", () => {
  it("offers exactly one select action on every tab root", () => {
    for (const example of examples) {
      const parsed = stampItemIds(meta, props.parse(example));
      expect(affordancesOf(meta, parsed, "t1")).toEqual(
        example.tabs.map((_, index) => ({
          address: `t1/r${index + 1}`,
          part: "root",
          action: "select",
          detail: "",
        })),
      );
    }
  });
  it("has the declared code-owned region, parts, state, actions, tier and real path", () => {
    expect(meta).toMatchObject({
      id: "TabBar",
      group: "structure",
      region: "bottom",
      weight: 1,
      tier: "phone",
      codeOwned: true,
      items: { key: "tabs", parts: ["root", "icon", "label"] },
      parts: ["root"],
      states: ["filled"],
      actions: { items: { root: ["select"] } },
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Segmented");
    expect(meta.pick).toContain("Actions");
    expect(meta.aliases.length).toBeGreaterThanOrEqual(3);
    expect(meta.aliases.length).toBeLessThanOrEqual(5);
  });
  it("has only read probes and targets an existing tab action in each example", () => {
    expect(probes).toHaveLength(2);
    expect(probes.map((probe) => probe.kind)).toEqual(["read", "read"]);
    for (const probe of probes) {
      expect(probe.task.trim()).not.toBe("");
      const example = examples[probe.screen]!;
      const parsed = stampItemIds(meta, props.parse(example));
      expect(affordancesOf(meta, parsed, "t1")).toContainEqual({
        ...probe.expect,
        part: "root",
        detail: "",
      });
    }
  });
  it("builds a data-only registry with case and separator tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("TabBar");
    expect(registry.schema("TabBar")).toBe(props);
    expect(registry.resolve("BOTTOM-NAV")).toBe("TabBar");
    expect(registry.resolve("MainTabs")).toBe("TabBar");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});
