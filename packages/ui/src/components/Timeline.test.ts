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

const { props, meta, examples, fallback, probes } = components.Timeline;
const item = { time: "09:00", title: "Morning walk" };

describe("Timeline schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ items: [{ time: " 09:00 ", title: " Morning walk ", meta: " Park " }] })).toEqual({
      style: "day",
      items: [{ ...item, meta: "Park", done: false }],
    });
  });
  it.each([
    {},
    { items: [] },
    { items: Array.from({ length: 7 }, () => item) },
    { items: [{ title: "Morning walk" }] },
    { items: [{ time: "09:00" }] },
    { items: [{ ...item, time: "" }] },
    { items: [{ ...item, time: " ".repeat(4) }] },
    { items: [{ ...item, time: "a".repeat(13) }] },
    { items: [{ ...item, title: "" }] },
    { items: [{ ...item, title: " ".repeat(4) }] },
    { items: [{ ...item, title: "a".repeat(33) }] },
    { items: [{ ...item, meta: "" }] },
    { items: [{ ...item, meta: " ".repeat(4) }] },
    { items: [{ ...item, meta: "a".repeat(33) }] },
    { items: [{ ...item, done: "true" }] },
    { items: [{ ...item, id: "r1" }] },
    { items: [{ ...item, goto: "walk" }] },
    { items: [{ ...item, pixels: 4 }] },
    { items: [{ ...item, color: "red" }] },
    { style: "list", items: [item] },
    { color: "red", items: [item] },
    { items: [item], actions: ["press"] },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum lengths and count", () => {
    const longest = { time: "a".repeat(12), title: "a".repeat(32), meta: "a".repeat(32), done: true };
    expect(props.safeParse({ items: Array.from({ length: 6 }, () => longest) }).success).toBe(true);
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["items"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["items"][number]["done"]>().toEqualTypeOf<boolean>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Timeline fallback and metadata", () => {
  it("validates empty, full, mixed, long and malformed casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name", "room"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
      },
      {
        things: [],
        items: [
          { id: "dog", type: "dog", sample: true, title: "Clover" },
          { id: "plant", type: "plant", sample: true, name: "Fern" },
        ],
      },
      {
        things: [{ type: "plant", fields: ["name", "room"] }],
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `plant_${index}`,
          type: "plant",
          sample: false,
          name: "x".repeat(80),
          room: "y".repeat(80),
        })),
      },
      { things: [], items: [{ id: "fern", type: "plant", sample: true, name: 4 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[1]! }).items[0]).toEqual({
      time: "—",
      title: "Fern",
      meta: "Bathroom",
    });
    expect(fallback({ cast: casts[2]! }).items).toHaveLength(1);
    expect(fallback({ cast: casts[3]! }).items).toHaveLength(3);
    expect(fallback({ cast: casts[0]! }).items.map((row) => row.title)).toEqual([
      "Item one",
      "Item two",
      "Item three",
    ]);
    expect(props.parse(fallback({ cast: casts[0]! })).items.every((row) => !row.done)).toBe(true);
  });
  it("declares exactly its static parts, states and tier without actions", () => {
    expect(meta).toMatchObject({
      id: "Timeline",
      group: "data",
      region: "body",
      weight: 2,
      tier: "phone",
      parts: ["root"],
      items: { key: "items", parts: ["root", "time", "title", "meta"] },
      states: ["filled", "empty", "loading"],
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const style of ["day", "history"] as const) {
      for (const done of [false, true]) {
        const parsed = stampItemIds(meta, props.parse({ style, items: [{ ...item, done }] }));
        expect(affordancesOf(meta, parsed, "t1")).toEqual([]);
      }
    }
    expect(meta).not.toHaveProperty("actions");
  });
  it("reads the visible times, titles and details in input order", () => {
    const read = readComponent(
      components.Timeline,
      {
        style: "history",
        items: [
          { ...item, meta: "Park", done: true },
          { time: "Mon", title: "Visit" },
        ],
      },
      "t1",
    ).join("\n");
    for (const text of ["09:00", "Morning walk", "Park", "Mon", "Visit"]) expect(read).toContain(text);
    expect(read.indexOf("Morning walk")).toBeLessThan(read.indexOf("Visit"));
  });
  it("has two choose probes with a near miss and one write, with no action probe", () => {
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Timeline")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "List")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Timeline" });
    expect(probes.map((probe) => probe.kind)).not.toContain("read");
    expect(meta.pick).toContain("List");
    expect(meta.pick).toContain("Checklist");
  });
  it("is found automatically with case and separator tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Timeline");
    expect(registry.schema("Timeline")).toBe(props);
    expect(registry.resolve("TIME-LINE")).toBe("Timeline");
    expect(registry.resolve("AGENDA")).toBe("Timeline");
    expect(registry.resolve("chronology")).toBe("Timeline");
  });
});
