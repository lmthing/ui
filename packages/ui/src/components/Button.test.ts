import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  migrateLine,
  placeholderLabel,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Button;

describe("Button schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("exercises every media value and optional field in the examples", () => {
    const parsed = examples.map((example) => props.parse(example));
    for (const axis of ["media"] as const)
      expect(new Set(parsed.map((example) => example[axis]))).toEqual(new Set(meta.variants[axis]));
    expect(parsed.some((example) => example.icon)).toBe(true);
    expect(parsed.some((example) => example.goto && example.goto !== "back")).toBe(true);
    expect(parsed.some((example) => example.goto === "back")).toBe(true);
  });
  it("applies defaults and trims text", () => {
    expect(props.parse({ label: "  Continue  " })).toEqual({
      label: "Continue",
      media: "icon",
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
    { label: "Continue", kind: "primary" },
    { label: "Continue", surface: "outlined" },
    { label: "Continue", tone: "warn" },
    { label: "Continue", media: "cover" },
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
  it("accepts exact maximum lengths", () => {
    expect(props.safeParse({ label: "a".repeat(24), icon: "drop", goto: "a".repeat(64) }).success).toBe(true);
    expect(props.safeParse({ label: "Continue", goto: "next_screen_1" }).success).toBe(true);
  });
});

describe("Button view props", () => {
  it("derives view props without item ids or visual overrides", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["label"]>().toEqualTypeOf<string>();
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
      expect(value).toEqual({ label: placeholderLabel });
    }
  });
  it("has the declared region, parts, state, actions, tier and real path", () => {
    expect(meta).toMatchObject({
      id: "Button",
      group: "action",
      region: "bottom",
      weight: 1,
      tier: "phone",
      parts: ["root", "root_icon"],
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
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(3);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Button" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Press the main button",
      expect: { address: "b1/root", action: "press" },
    });
  });
});

describe("Button fallback and metadata", () => {
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

describe("Button variants", () => {
  it.each([
    ["primary", {}],
    ["secondary", {}],
    ["quiet", {}],
    ["secondary", {}],
  ])("migrates a saved %s button and keeps its address and link", (kind, override) => {
    const { c, id, state, ...wire } = migrateLine({
      c: "Button",
      id: "b1",
      state: "filled",
      kind,
      label: "Continue",
      goto: "schedule",
      confirm: "Continue?",
      ...override,
    });
    expect({ c, id, state }).toEqual({ c: "Button", id: "b1", state: "filled" });
    expect(wire).not.toHaveProperty("kind");
    const parsed = props.parse(wire);
    expect(parsed).toMatchObject({ confirm: "Continue?" });
    expect(parsed).not.toHaveProperty("surface");
    expect(affordancesOf(meta, parsed, id as string)).toEqual([
      { address: "b1", part: "root", action: "press", detail: "→schedule" },
    ]);
  });
  it("hides only the icon part for media none", () => {
    const input = { label: "Log watering", icon: "drop" };
    const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
    const draw = (wire: unknown) => renderInstance("Button", wire, "filled", theme);
    expect(meta.variantParts["media.none"].hides).toEqual(["root_icon"]);
    expect(draw(input)).toContain('data-testid="home/c1/root_icon"');
    const hidden = draw({ ...input, media: "none" });
    expect(hidden).not.toContain('data-testid="home/c1/root_icon"');
    expect(hidden).toContain('data-testid="home/c1/root_label"');
    expect(hidden).toContain('role="button"');
  });
});
