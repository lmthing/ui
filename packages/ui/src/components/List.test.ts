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
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.List;

describe("List schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ rows: [{ title: "  Fern  " }] })).toEqual({
      style: "inset",
      rows: [{ title: "Fern", trail: "chevron", root: undefined }],
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
    { style: "grid", rows: [{ title: "Fern" }] },
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

describe("List shelf, expand and ranked", () => {
  const photoRow = (title: string) => ({ title, photo: "lib:plants" });
  it.each([
    { style: "shelf", rows: [photoRow("Fern")] },
    { style: "shelf", rows: [photoRow("Fern"), { title: "Basil" }] },
    { style: "expand", rows: [{ title: "Q", body: "A" }, { title: "Q2" }] },
    {
      style: "ranked",
      rows: [
        { title: "Anna", me: true },
        { title: "Ben", me: true },
      ],
    },
    { style: "expand", rows: [{ title: "Q", body: "a".repeat(201) }] },
  ])("rejects a style used without what it needs", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("lets a body make the rows expand and a me row make a ranking", () => {
    expect(props.parse({ style: "inset", rows: [{ title: "Q", body: "A", goto: "x" }] }).style).toBe(
      "expand",
    );
    expect(props.parse({ rows: [{ title: "Anna", me: true }] }).style).toBe("ranked");
  });
  it("offers press on linked rows of a shelf and toggle on every row of an expand", () => {
    const shelf = props.parse({
      style: "shelf",
      rows: [{ ...photoRow("Fern"), goto: "fern" }, photoRow("Basil")],
    });
    expect(affordancesOf(meta, stampItemIds(meta, shelf), "l1")).toEqual([
      { address: "l1/r1", part: "root", action: "press", detail: "→fern" },
    ]);
    const expand = props.parse({
      style: "expand",
      rows: [
        { title: "Q1", body: "A1", goto: "ignored" },
        { title: "Q2", body: "A2" },
      ],
    });
    expect(
      affordancesOf(meta, stampItemIds(meta, expand), "l1").map((a) => `${a.address} ${a.action}`),
    ).toEqual(["l1/r1 toggle", "l1/r2 toggle"]);
  });
  it("numbers a ranking, reads it in order and offers nothing without links", () => {
    const input = {
      style: "ranked",
      rows: [
        { title: "Anna", value: "412" },
        { title: "You", value: "351", me: true },
      ],
    };
    const line = readComponent(components.List, input, "l1").join("\n");
    expect(line.indexOf("Anna")).toBeLessThan(line.indexOf("You"));
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "l1")).toEqual([]);
    const html = renderInstance("List", input, "filled", { preset: "calm", mode: "light", accent: "moss" });
    expect(html).toContain('data-testid="home/c1/r2/root"');
  });
  it("opens rows in place as buttons and carries every body on screen", () => {
    const input = { style: "expand", rows: [{ title: "Q1", body: "Answer one" }] };
    const html = renderInstance("List", input, "filled", { preset: "calm", mode: "light", accent: "moss" });
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("Answer one");
    expect(html).toContain('data-testid="home/c1/r1/body"');
  });
});
