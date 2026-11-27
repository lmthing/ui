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
import { createScreenController } from "@lmthing/ui/kit";

const { props, meta, examples, fallback, probes } = components.Checklist;

it("updates the count one item at a time and reverses the addressed item", () => {
  const screen = { id: "home", components: [{ id: "k1", c: "Checklist", ...examples[0]! }] };
  const controller = createScreenController({ screen, defs: components });
  try {
    expect(controller.read()).toContain("1 of 3 complete");
    expect(controller.press("k1/r1/check").ok).toBe(true);
    expect(controller.read()).toContain("2 of 3 complete");
    expect(controller.press("k1/r3/check").ok).toBe(true);
    expect(controller.read()).toContain("3 of 3 complete");
    expect(controller.press("k1/r1/check").ok).toBe(true);
    expect(controller.read()).toContain("2 of 3 complete");
    expect(controller.read()).toContain("k1/r1/check check:todo");
  } finally {
    controller.dispose();
  }
});

describe("Checklist schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ items: [{ text: "  First job  ", meta: "  Today  " }] })).toEqual({
      detail: "full",
      items: [{ text: "First job", done: false, meta: "Today", mark: "none" }],
    });
  });
  it.each([
    {},
    { items: [] },
    { items: Array.from({ length: 7 }, () => ({ text: "First job" })) },
    { items: [{ text: "" }] },
    { items: [{ text: " ".repeat(4) }] },
    { items: [{ text: "a".repeat(37) }] },
    { items: [{ text: "First job", meta: "a".repeat(25) }] },
    { items: [{ text: "First job", meta: "" }] },
    { items: [{ text: "First job", meta: " ".repeat(4) }] },
    { items: [{ text: "First job", done: "true" }] },
    { items: [{ text: "First job", done: 1 }] },
    { items: [{ text: "First job", done: null }] },
    { items: [{ text: 4 }] },
    { items: [{ text: "First job", meta: 4 }] },
    { style: "inset", items: [{ text: "First job" }] },
    { detail: "none", items: [{ text: "First job" }] },
    { items: [{ text: "First job", mark: "warn" }] },
    { color: "red", items: [{ text: "First job" }] },
    { items: [{ text: "First job", pixels: 4 }] },
    { items: [{ text: "First job", color: "red" }] },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum lengths and count, and both completion values", () => {
    const item = { text: "a".repeat(36), meta: "a".repeat(24), done: true };
    expect(props.safeParse({ items: Array.from({ length: 6 }, () => item) }).success).toBe(true);
    expect(props.parse({ items: [{ text: "First job", done: false }] }).items[0]!.done).toBe(false);
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["items"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["items"][number]["text"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["items"][number]["done"]>().toEqualTypeOf<boolean>();
    expectTypeOf<ViewProps["items"][number]["meta"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expect(props.safeParse({ items: [{ text: "First job", id: "r1" }] }).success).toBe(false);
  });
  it("hides notes without changing item addresses or actions", () => {
    const input = { items: [{ text: "First job", meta: "Later", mark: "highlight" }] };
    const full = stampItemIds(meta, props.parse(input));
    const brief = stampItemIds(meta, props.parse({ ...input, detail: "brief" }));
    expect(brief.items[0]).toMatchObject({ id: "r1", meta: undefined, mark: "highlight" });
    expect(affordancesOf(meta, brief, "k1")).toEqual(affordancesOf(meta, full, "k1"));
    expect(meta.variantParts["detail.brief"]).toEqual({ hides: ["meta"] });
  });
});

describe("Checklist fallback", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "job", fields: ["label", "detail"] }],
        items: [{ id: "first", type: "job", sample: true, label: "First job", detail: "Today" }],
      },
      {
        things: [],
        items: [
          { id: "first", type: "job", sample: true, title: "First job" },
          { id: "other", type: "other", sample: true, name: "Other item" },
        ],
      },
      {
        things: [{ type: "job", fields: ["label"] }],
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `job_${index}`,
          type: "job",
          sample: false,
          label: "x".repeat(80),
        })),
      },
      { things: [], items: [{ id: "first", type: "job", sample: true, name: 4 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[1]! }).items[0]).toEqual({ text: "First job", done: false });
    expect(fallback({ cast: casts[2]! }).items).toHaveLength(1);
    expect(fallback({ cast: casts[3]! }).items).toEqual(
      Array.from({ length: 4 }, () => ({ text: "x".repeat(36), done: false })),
    );
    const placeholders = [
      { text: "Item one", done: false },
      { text: "Item two", done: false },
      { text: "Item three", done: false },
    ];
    expect(fallback({ cast: casts[0]! }).items).toEqual(placeholders);
    expect(fallback({ cast: casts[4]! }).items).toEqual(placeholders);
  });
  it("uses declared field order and discards unusable titles", () => {
    const cast: CastLike = {
      things: [{ type: "job", fields: ["label", "detail"] }],
      items: [
        { id: "blank", type: "job", sample: false, label: " ", detail: 4 },
        { id: "valid", type: "job", sample: false, detail: "Later", label: "Second job" },
      ],
    };
    expect(fallback({ cast }).items).toEqual([{ text: "Second job", done: false }]);
  });
});

describe("Checklist metadata and probes", () => {
  it("has the declared tier, parts, states, actions and well-formed probes", () => {
    expect(meta).toMatchObject({
      id: "Checklist",
      group: "input",
      region: "body",
      weight: 2,
      tier: "phone",
      items: { key: "items", parts: ["root", "check", "text", "meta"] },
      states: ["filled", "empty", "loading"],
      actions: { items: { check: ["check"] } },
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("List");
    expect(meta.pick).toContain("Steps");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "List")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Checklist" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Tick off the first job",
      expect: { address: "k1/r1/check", action: "check" },
    });
  });
  it.each([false, true])("offers only the checkbox action when done is %s", (done) => {
    const input = {
      items: [
        { text: "First job", done },
        { text: "Second job", meta: "Later" },
      ],
    };
    const viewProps = stampItemIds(meta, props.parse(input));
    expect(affordancesOf(meta, viewProps, "k1")).toEqual([
      {
        address: "k1/r1/check",
        part: "check",
        action: "check",
        detail: done ? ":done" : ":todo",
        input: { kind: "check" },
      },
      { address: "k1/r2/check", part: "check", action: "check", detail: ":todo", input: { kind: "check" } },
    ]);
    expect(readComponent(components.Checklist, input, "k1")).toEqual([
      `k1 Checklist ${done ? 1 : 0} of 2 complete`,
      `  r1 "First job" [k1/r1/check check:${done ? "done" : "todo"}]`,
      '  r2 "Second job" · "Later" [k1/r2/check check:todo]',
    ]);
  });
  it.each(["empty", "loading"] as const)("does not offer hidden item actions in %s", (state) => {
    expect(readComponent(components.Checklist, examples[0], "k1", state)).toEqual([
      `k1 Checklist (${state})${state === "empty" ? " No checklist items yet" : ""}`,
    ]);
  });
});

it("builds a data-only registry with case and separator tolerant ids", () => {
  const registry = createRegistry();
  expect(registry.ids).toContain("Checklist");
  expect(registry.schema("Checklist")).toBe(props);
  expect(registry.resolve("check-list")).toBe("Checklist");
  expect(registry.resolve("c-h-e-c-k-l-i-s-t")).toBe("Checklist");
  expect(registry.resolve("unknown")).toBeUndefined();
});
