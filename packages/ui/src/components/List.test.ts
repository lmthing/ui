import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.List;

describe("List schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ rows: [{ title: "  Fern  " }] })).toMatchObject({
      surface: "card",
      overflow: "all",
      lead: "icon",
      rows: [{ title: "Fern", trail: "chevron", tone: "neutral", mark: "none" }],
    });
  });
  it.each([
    {},
    { rows: [] },
    { rows: Array.from({ length: 7 }, () => ({ title: "Fern" })) },
    { rows: [{ title: "" }] },
    { rows: [{ title: " ".repeat(4) }] },
    { rows: [{ title: "a".repeat(29) }] },
    { rows: [{ title: "Fern", meta: "a".repeat(37) }] },
    { rows: [{ title: "Fern", value: "a".repeat(11) }] },
    { rows: [{ title: "Fern", icon: "unknown" }] },
    { rows: [{ title: "Fern", trail: "arrow" }] },
    { rows: [{ title: "Fern", goto: "Bad ID" }] },
    { rows: [{ title: "Fern", goto: "a".repeat(65) }] },
    { rows: [{ title: "Fern", photo: "https://example.org/image.png" }] },
    { rows: [{ title: "Fern", photo: `lib:${"a".repeat(65)}` }] },
    { style: "masonry", rows: [{ title: "Fern" }] },
    { rows: [{ title: "Fern", progress: 0.5 }] },
    { rows: [{ title: "Fern", badge: "New" }] },
    { color: "red", rows: [{ title: "Fern" }] },
    { rows: [{ title: "Fern", pixels: 4 }] },
    { rows: [{ title: "Fern", root: "fern" }] },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum lengths, count and reference forms", () => {
    const row = {
      title: "a".repeat(28),
      meta: "a".repeat(36),
      value: "a".repeat(10),
      goto: "a".repeat(64),
      photo: "lib:plant",
    };
    expect(props.safeParse({ rows: Array.from({ length: 6 }, () => row) }).success).toBe(true);
    expect(props.safeParse({ rows: [{ title: "Fern", photo: "local:1" }] }).success).toBe(true);
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["rows"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["rows"][number]["title"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expect(props.safeParse({ rows: [{ title: "Fern", id: "r1" }] }).success).toBe(false);
  });
});

it("allows both shelf progress endpoints, and preserves grid link addresses", () => {
  const rows = [
    { title: "Fern", photo: "lib:fern", progress: 0 },
    { title: "Basil", photo: "lib:basil", progress: 1 },
  ];
  expect(props.safeParse({ style: "shelf", aspect: "tall", rows }).success).toBe(true);
  for (const progress of [-0.01, 1.01])
    expect(props.safeParse({ style: "shelf", rows: [{ ...rows[0], progress }, rows[1]] }).success).toBe(
      false,
    );
  const grid = props.parse({
    style: "grid",
    rows: [
      { title: "Fern", goto: "fern", pinned: true },
      { title: "Basil", unread: true },
    ],
  });
  expect(affordancesOf(meta, stampItemIds(meta, grid), "l1")).toEqual([
    { address: "l1/r1", part: "root", action: "press", detail: "→fern" },
  ]);
});

describe("List fallback and metadata", () => {
  it.each(["none", "chevron", "check", "toggle", "value", "badge"] as const)(
    "offers only drawn actions for a %s trail, with and without navigation",
    (trail) => {
      for (const goto of [undefined, "fern", "back", "plant_details"]) {
        const input = { rows: [{ title: "Fern", trail, value: "Ready", goto }] };
        const rows = stampItemIds(meta, props.parse(input));
        expect(affordancesOf(meta, rows, "l1")).toEqual([
          ...(goto ? [{ address: "l1/r1", part: "root", action: "press", detail: `→${goto}` }] : []),
          ...(trail === "toggle"
            ? [{ address: "l1/r1/trail", part: "trail", action: "toggle", detail: "" }]
            : []),
        ]);
      }
    },
  );
  it("validates with empty, full, mixed and malformed cast content", () => {
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
    expect(fallback({ cast: casts[1]! }).rows[0]).toEqual({ title: "Fern", meta: "Bathroom" });
    expect(fallback({ cast: casts[2]! }).rows).toHaveLength(1);
    expect(fallback({ cast: casts[3]! }).rows).toHaveLength(3);
    expect(fallback({ cast: casts[0]! }).rows.map((row) => row.title)).toEqual([
      "Item one",
      "Item two",
      "Item three",
    ]);
  });
});

describe("List fallback and metadata", () => {
  it("has a tier, real path and well-formed choose, write and read probes", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Card");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "KeyValue")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "List" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      expect: { address: "l1/r1/trail", action: "toggle" },
    });
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("List");
    expect(registry.schema("List")).toBe(props);
    expect(registry.resolve("l-i-s-t")).toBe("List");
    expect(registry.resolve("l-i-s-t")).toBe("List");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});
