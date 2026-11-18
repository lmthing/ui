import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  placeholderLabel,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.Button;

describe("Button schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("exercises every kind and optional field in the examples", () => {
    const parsed = examples.map((example) => props.parse(example));
    expect(new Set(parsed.map((example) => example.kind))).toEqual(
      new Set(["primary", "secondary", "quiet", "danger"]),
    );
    expect(parsed.some((example) => example.icon)).toBe(true);
    expect(parsed.some((example) => example.goto && example.goto !== "back")).toBe(true);
    expect(parsed.some((example) => example.goto === "back")).toBe(true);
  });
  it("applies defaults and trims text", () => {
    expect(props.parse({ label: "  Continue  " })).toEqual({
      label: "Continue",
      kind: "primary",
    });
  });
  it.each([
    {},
    { label: "" },
    { label: " ".repeat(4) },
    { label: "a".repeat(25) },
    { label: 4 },
    { label: "Continue", kind: "filled" },
    { label: "Continue", kind: null },
    { label: "Continue", icon: "unknown" },
    { label: "Continue", icon: null },
    { label: "Continue", goto: "" },
    { label: "Continue", goto: "Bad ID" },
    { label: "Continue", goto: "next_screen-1" },
    { label: "Continue", goto: "a".repeat(65) },
    { label: "Continue", goto: "https://example.org" },
    { label: "Continue", color: "red" },
    { label: "Continue", pixels: 4 },
    { label: "Continue", full: true },
    { label: "Continue", id: "b1" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact maximum lengths and every kind", () => {
    for (const kind of ["primary", "secondary", "quiet", "danger"]) {
      expect(
        props.safeParse({ label: "a".repeat(24), kind, icon: "drop", goto: "a".repeat(64) }).success,
      ).toBe(true);
    }
    expect(props.safeParse({ label: "Continue", goto: "next_screen_1" }).success).toBe(true);
  });
  it("derives view props without item ids or visual overrides", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["kind"]>().toEqualTypeOf<"primary" | "secondary" | "quiet" | "danger">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Button fallback and metadata", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "entry", fields: ["name"] }],
        items: [{ id: "entry_1", type: "entry", sample: true, name: "First entry" }],
      },
      {
        things: [],
        items: [
          { id: "entry_1", type: "entry", sample: true, title: "First entry" },
          { id: "task_1", type: "task", sample: true, name: "First task" },
        ],
      },
      {
        things: [{ type: "entry", fields: ["name"] }],
        items: [{ id: "entry_1", type: "entry", sample: true, name: 4 }],
      },
    ];
    for (const cast of casts) {
      const value = fallback({ cast });
      expect(props.safeParse(value).success).toBe(true);
      expect(value).toEqual({ label: placeholderLabel, kind: "primary" });
    }
  });
  it("has the declared region, parts, state, actions, tier and real path", () => {
    expect(meta).toMatchObject({
      id: "Button",
      group: "action",
      region: "bottom",
      weight: 1,
      tier: "phone",
      parts: ["root"],
      states: ["filled"],
      actions: { parts: { root: ["press"] } },
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Actions");
    expect(meta.pick).toContain("Card");
  });
  it("has well-formed choose, write and read probes", () => {
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Button")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Actions")).toBeDefined();
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Button" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Press the main button",
      expect: { address: "b1/root", action: "press" },
    });
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Button");
    expect(registry.schema("Button")).toBe(props);
    expect(registry.resolve("b-u-t-t-o-n")).toBe("Button");
    expect(registry.resolve("b-u-t-t-o-n")).toBe("Button");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

describe("Button confirm", () => {
  it("takes a short sentence and asks first without drawing it", () => {
    expect(props.safeParse({ label: "Remove", kind: "danger", confirm: "Remove it?" }).success).toBe(true);
    for (const confirm of ["", "   ", "a".repeat(61), 4])
      expect(props.safeParse({ label: "Remove", confirm }).success).toBe(false);
    const line = readComponent(components.Button, { label: "Remove", confirm: "Remove it?" }, "b1").join(" ");
    expect(line).toContain("asks first");
    expect(line).not.toContain("Remove it?");
    expect(readComponent(components.Button, { label: "Remove" }, "b1").join(" ")).not.toContain("asks first");
  });
});
