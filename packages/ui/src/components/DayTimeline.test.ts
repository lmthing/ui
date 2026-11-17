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

const { props, meta, examples, fallback, probes } = components.DayTimeline;
const block = { start: "09:00", end: "10:00", title: "Morning walk" };

describe("DayTimeline examples", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text, defaults tone, and orders blocks without mutating input", () => {
    const input = {
      blocks: [
        { start: " 12:00 ", end: " 13:00 ", title: " Lunch walk " },
        { ...block, goto: "morning_walk" },
      ],
    };
    expect(props.parse(input).blocks).toEqual([
      { ...block, tone: "neutral", goto: "morning_walk", root: "morning_walk" },
      { start: "12:00", end: "13:00", title: "Lunch walk", tone: "neutral", root: undefined },
    ]);
    expect(input.blocks[0]!.start).toBe(" 12:00 ");
  });
});

describe("DayTimeline invalid inputs and boundaries", () => {
  it.each([
    {},
    { blocks: [] },
    { blocks: Array.from({ length: 9 }, () => block) },
    { blocks: [{ start: "09:00", end: "10:00" }] },
    { blocks: [{ title: "Walk", end: "10:00" }] },
    { blocks: [{ title: "Walk", start: "09:00" }] },
    ...["", "9:00", "09:000", "24:00", "12:60", "aa:bb", "09.00", "-1:00"].flatMap((time) => [
      { blocks: [{ ...block, start: time }] },
      { blocks: [{ ...block, end: time }] },
    ]),
    { blocks: [{ ...block, end: "09:00" }] },
    { blocks: [{ ...block, end: "08:59" }] },
    { blocks: [{ ...block, start: "23:00", end: "01:00" }] },
    ...["", "   ", "a".repeat(33)].map((title) => ({ blocks: [{ ...block, title }] })),
    { blocks: [{ ...block, tone: "accent" }] },
    { blocks: [{ ...block, tone: "#ff0000" }] },
    { blocks: [{ ...block, goto: "Bad ID" }] },
    { blocks: [{ ...block, goto: "a".repeat(65) }] },
    { blocks: [{ ...block, id: "r1" }] },
    { blocks: [{ ...block, root: "walk" }] },
    { blocks: [{ ...block, color: "red" }] },
    { blocks: [{ ...block, height: 44 }] },
    { color: "red", blocks: [block] },
    { style: "day", blocks: [block] },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts eight blocks, all tones, maximum text/link lengths, and day boundaries", () => {
    const longest = {
      start: "00:00",
      end: "23:59",
      title: "a".repeat(32),
      goto: "a".repeat(64),
    };
    for (const tone of ["neutral", "good", "warn", "bad"] as const) {
      expect(
        props.safeParse({ blocks: Array.from({ length: 8 }, () => ({ ...longest, tone })) }).success,
      ).toBe(true);
    }
    expect(props.safeParse({ blocks: [{ ...block, end: "09:01" }] }).success).toBe(true);
    expect(props.safeParse({ blocks: [{ ...block, goto: "back" }] }).success).toBe(true);
  });
  it("adds validator ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["blocks"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["blocks"][number]["tone"]>().toEqualTypeOf<"neutral" | "good" | "warn" | "bad">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("DayTimeline fallback and metadata", () => {
  it("validates empty, matching, mixed, long, and malformed casts", () => {
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
        things: [{ type: "plant", fields: ["name"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "x".repeat(80) }],
      },
      { things: [], items: [{ id: "fern", type: "plant", sample: true, name: 4 }] },
    ];
    for (const cast of casts) {
      const result = fallback({ cast });
      expect(props.safeParse(result).success).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0]).toMatchObject({ start: "09:00", end: "10:00" });
    }
    expect(fallback({ cast: casts[0]! }).blocks[0]!.title).toBe("Item one");
    expect(fallback({ cast: casts[1]! }).blocks[0]!.title).toBe("Fern");
    expect(fallback({ cast: casts[2]! }).blocks[0]!.title).toBe("Clover");
    expect(fallback({ cast: casts[3]! }).blocks[0]!.title.length).toBeLessThanOrEqual(32);
    expect(fallback({ cast: casts[4]! }).blocks[0]!.title).toBe("Item one");
  });
  it("declares exactly the required parts, states, tier and weight", () => {
    expect(meta).toMatchObject({
      id: "DayTimeline",
      group: "data",
      region: "body",
      weight: 3,
      tier: "phone",
      items: { key: "blocks", parts: ["root", "time", "title"] },
      parts: ["root"],
      states: ["filled", "empty"],
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
  });
  it("reads the visible ranges and titles in chronological order", () => {
    const input = { blocks: [{ start: "12:00", end: "13:00", title: "Lunch" }, block] };
    const read = readComponent(components.DayTimeline, input, "d1").join("\n");
    for (const text of ["09:00–10:00", "12:00–13:00", "Morning walk", "Lunch"]) expect(read).toContain(text);
    expect(read.indexOf("Morning walk")).toBeLessThan(read.indexOf('"Lunch"'));
    expect(readComponent(components.DayTimeline, input, "d1", "empty")).toEqual(["d1 DayTimeline (empty)"]);
  });
});

describe("DayTimeline probes and registration", () => {
  it("offers a root press only when goto exists", () => {
    for (const goto of [undefined, "walk", "back", "walk_details"]) {
      const parsed = stampItemIds(meta, props.parse({ blocks: [{ ...block, goto }] }));
      expect(affordancesOf(meta, parsed, "d1")).toEqual(
        goto ? [{ address: "d1/r1", part: "root", action: "press", detail: `→${goto}` }] : [],
      );
    }
  });
  it("has two choose probes, a named near miss, one write, and an action read", () => {
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "DayTimeline")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Timeline")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "DayTimeline" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      expect: { address: "d1/r1", action: "press" },
    });
    expect(meta.pick).toContain("Timeline");
    expect(meta.pick).toContain("Calendar");
  });
  it("is found automatically through case and separator tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.schema("DayTimeline")).toBe(props);
    expect(registry.resolve("day-timeline")).toBe("DayTimeline");
    expect(registry.resolve("TIME-BLOCKS")).toBe("DayTimeline");
  });
});
