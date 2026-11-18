import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  placeholderDetail,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Field;

describe("Field schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults, trims text and derives the input action", () => {
    expect(props.parse({ label: "  Name  ", value: "  Fern  ", hint: "  Required  " })).toEqual({
      kind: "text",
      label: "Name",
      value: "Fern",
      hint: "Required",
      mode: "input",
    });
  });
  it.each([
    {},
    { label: "" },
    { label: "   " },
    { label: "a".repeat(25) },
    { label: "Name", value: "" },
    { label: "Name", value: "a".repeat(41) },
    { label: "Name", hint: "a".repeat(61) },
    { label: "Name", kind: "email" },
    { label: "Name", options: ["A", "B"] },
    { label: "Length", kind: "choice" },
    { label: "Length", kind: "choice", options: ["A"] },
    { label: "Length", kind: "choice", options: ["A", "B", "C", "D", "E"] },
    { label: "Length", kind: "choice", options: ["A", ""] },
    { label: "Length", kind: "choice", options: ["A", "a".repeat(17)] },
    { label: "Length", kind: "choice", options: ["A", "A"] },
    { label: "Length", kind: "choice", options: ["A", "B"], value: "C" },
    { label: "Reminder", kind: "toggle", value: "yes" },
    { label: "Amount", kind: "number", value: "many" },
    { label: "Level", kind: "slider", value: "NaN" },
    { label: "Level", kind: "slider", value: "Infinity" },
    { label: "Name", color: "red" },
    { label: "Name", pixels: 44 },
    { label: "Name", mode: true },
    { kind: "repeat", label: "Water it", repeat: "fortnightly" },
    { kind: "text", label: "Name", repeat: "weekly" },
    { label: "Name", id: "r1" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact text limits and two to four distinct choice options", () => {
    expect(
      props.safeParse({ label: "a".repeat(24), value: "a".repeat(40), hint: "a".repeat(60) }).success,
    ).toBe(true);
    for (const count of [2, 4]) {
      expect(
        props.safeParse({
          kind: "choice",
          label: "Length",
          options: Array.from({ length: count }, (_, i) => `${i}${"a".repeat(15)}`),
        }).success,
      ).toBe(true);
    }
  });
  it.each(["on", "off"])("accepts toggle state %s", (value) =>
    expect(props.safeParse({ kind: "toggle", label: "Reminder", value }).success).toBe(true),
  );
  it.each(["-12", "0", "5.5", "25"])("accepts finite numeric values %s", (value) => {
    for (const kind of ["number", "slider"])
      expect(props.safeParse({ kind, label: "Amount", value }).success).toBe(true);
  });
  it("keeps strict wire props and typed view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toHaveProperty("mode");
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
  });
});

describe("Field fallback and metadata", () => {
  it("validates empty, full, long and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name", "room"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
      },
      { things: [{ type: "dog", fields: ["  Arrival time  "] }], items: [] },
      { things: [{ type: "thing", fields: ["x".repeat(80)] }], items: [] },
      {
        things: [{ type: "thing", fields: [" "] }],
        items: [{ id: "bad", type: "thing", sample: false, name: 4 }],
      },
      { things: [{ type: "thing", fields: [] }], items: [] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({ kind: "text", label: placeholderDetail });
    expect(fallback({ cast: casts[1]! })).toEqual({ kind: "text", label: "name" });
    expect(fallback({ cast: casts[2]! }).label).toBe("Arrival time");
    expect(fallback({ cast: casts[3]! }).label).toHaveLength(24);
  });
  it.each([
    ["text", "type"],
    ["number", "type"],
    ["date", "type"],
    ["time", "type"],
    ["choice", "select"],
    ["toggle", "toggle"],
    ["slider", "set"],
    ["photo", "press"],
  ])("offers only the %s control's %s action", (kind, action) => {
    for (const value of [
      undefined,
      kind === "toggle"
        ? "off"
        : kind === "choice"
          ? "A"
          : kind === "slider" || kind === "number"
            ? "3"
            : "Sample",
    ]) {
      const input = props.parse({
        kind,
        label: "Information",
        ...(value ? { value } : {}),
        ...(kind === "choice" ? { options: ["A", "B"] } : {}),
      });
      expect(affordancesOf(meta, input, "f1")).toEqual([
        { address: "f1/field", part: "field", action, detail: "" },
      ]);
    }
  });
  it("reads the input kind, choice options and shared photo action", () => {
    expect(readComponent(components.Field, examples[0], "f1").join("\n")).toContain("Field text");
    expect(readComponent(components.Field, examples[4], "f1").join("\n")).toContain("45 min");
    expect(readComponent(components.Field, examples[7], "f1").join("\n")).toContain("Add photo");
  });
  it("has well-formed metadata and choose, write and read probes", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Search");
    expect(meta.pick).toContain("Chips");
    expect(probes.filter((p) => p.kind === "choose")).toHaveLength(2);
    expect(probes.find((p) => p.kind === "choose" && p.expect === "Search")).toBeDefined();
    expect(probes.find((p) => p.kind === "write")).toMatchObject({ expect: "Field" });
    expect(probes.find((p) => p.kind === "read")).toMatchObject({
      screen: 0,
      task: "Name the plant Basil",
      expect: { address: "f1/field", action: "type" },
    });
    expect(new Set(examples.map((example) => example.kind)).size).toBe(9);
  });
  it("registers its data-only definition and aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Field");
    expect(registry.schema("Field")).toBe(props);
    expect(registry.resolve("form-field")).toBe("Field");
    expect(registry.resolve("INPUT")).toBe("Field");
  });
});

describe("Field rendering", () => {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  it.each(examples)("draws unique parts and the actual control value", (example) => {
    const html = renderInstance("Field", example, "filled", theme);
    for (const part of ["root", "label", "field"]) {
      expect(html.match(new RegExp(`data-testid="home/c1/${part}"`, "g"))).toHaveLength(1);
    }
    const field = html.match(/<[^>]*data-testid="home\/c1\/field"[^>]*>/)?.[0];
    const role =
      { choice: "radiogroup", repeat: "radiogroup", toggle: "switch", slider: "slider", photo: "button" }[
        example.kind as "choice"
      ] ?? "textbox";
    expect(field).toContain(`role="${role}"`);
    if (["text", "number", "date", "time"].includes(example.kind) && "value" in example) {
      expect(field).toContain(`value="${example.value}"`);
    }
  });
  it.each(["-12", "0", "5.5", "25"])("preserves slider value %s instead of clamping it", (value) => {
    const html = renderInstance("Field", { kind: "slider", label: "Level", value }, "filled", theme);
    expect(html).toContain(`aria-valuenow="${value}"`);
  });
});
