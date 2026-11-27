import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createScreenController } from "@lmthing/ui/kit";
import {
  affordancesOf,
  components,
  createRegistry,
  placeholderDetail,
  partTierAt,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.Field;

it("picks through the host, reports failure, retries, and detaches without exposing the token", async () => {
  const input = { label: "Care notes", kind: "file" };
  expect(props.safeParse({ ...input, value: "notes.pdf" }).success).toBe(false);
  const screen = { id: "home", components: [{ id: "f1", c: "Field", ...input }] };
  const run = vi
    .fn()
    .mockResolvedValueOnce({ status: "rejected" })
    .mockResolvedValueOnce({ status: "accepted", reference: "opaque_notes" });
  const controller = createScreenController({
    screen,
    defs: components,
    attachments: { canRun: () => true, run },
  });
  try {
    expect(controller.actionsAt("f1/field")).toEqual([]);
    expect(controller.actionsAt("f1/remove_attachment")).toEqual([]);
    expect(controller.press("f1/attach").ok).toBe(true);
    expect(controller.read()).toContain("Adding file");
    await vi.waitFor(() => expect(controller.read()).toContain("Couldn’t attach file"));
    expect(controller.press("f1/attach").ok).toBe(true);
    await vi.waitFor(() => expect(controller.attachmentReference("f1/attach")).toBe("opaque_notes"));
    expect(controller.read()).not.toContain("opaque_notes");
    expect(controller.press("f1/remove_attachment").ok).toBe(true);
    expect(controller.attachmentReference("f1/attach")).toBeUndefined();
    expect(controller.actionsAt("f1/remove_attachment")).toEqual([]);
    expect(run).toHaveBeenCalledTimes(2);
  } finally {
    controller.dispose();
  }
});

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
      detail: "full",
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
    { label: "Name", kind: "address" },
    { label: "Name", density: "airy" },
    { label: "Name", detail: "hidden" },
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
});

it("hides the hint in both the view data and the read without hiding the control", () => {
  const field = { label: "Plant name", hint: "Use a short name" };
  const brief = { ...field, detail: "brief" };
  expect(meta.variantParts["detail.brief"].hides).toEqual(["hint"]);
  expect(props.parse(field)).toMatchObject({ detail: "full", hint: field.hint });
  expect(props.parse(field)).not.toHaveProperty("density");
  expect(props.parse(brief)).toMatchObject({ hint: undefined });
  expect(readComponent(components.Field, field, "f1").join("\n")).toContain(field.hint);
  expect(readComponent(components.Field, brief, "f1").join("\n")).not.toContain(field.hint);
  expect(affordancesOf(meta, props.parse(brief), "f1")).toEqual(
    affordancesOf(meta, props.parse(field), "f1"),
  );
});

describe("Field schema", () => {
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
});

describe("Field fallback and metadata", () => {
  it.each([
    ["text", "type"],
    ["number", "type"],
    ["date", "type"],
    ["time", "type"],
    ["email", "type"],
    ["phone", "type"],
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
            : kind === "date"
              ? "2026-11-18"
              : kind === "time"
                ? "09:00"
                : kind === "photo"
                  ? "lib:plants"
                  : "Sample",
    ]) {
      const input = props.parse({
        kind,
        label: "Information",
        ...(value ? { value } : {}),
        ...(kind === "choice" ? { options: ["A", "B"] } : {}),
      });
      expect(affordancesOf(meta, input, "f1")).toEqual([
        { address: "f1/field", part: "field", action, detail: kind === "toggle" && value ? `:${value}` : "" },
      ]);
    }
  });
  it("reads the input kind, choice options and shared photo action", () => {
    expect(readComponent(components.Field, examples[0], "f1").join("\n")).toContain("Field text");
    expect(readComponent(components.Field, examples[4], "f1").join("\n")).toContain("45 min");
    expect(readComponent(components.Field, examples[7], "f1").join("\n")).toContain("Add photo");
  });
});

describe("Field fallback and metadata", () => {
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
    expect(new Set(examples.map((example) => example.kind)).size).toBe(16);
  });
  it("registers its data-only definition and ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Field");
    expect(registry.schema("Field")).toBe(props);
    expect(registry.resolve("f-i-e-l-d")).toBe("Field");
    expect(registry.resolve("f-i-e-l-d")).toBe("Field");
  });
});

describe("account fields", () => {
  it.each([4, 6, 8])("accepts %i code boxes", (length) => {
    expect(props.safeParse({ kind: "code", label: "Verification code", length }).success).toBe(true);
  });
  it.each([
    { kind: "code", length: 3 },
    { kind: "code", length: 9 },
    { kind: "code", length: 4.5 },
    { kind: "phone", length: 6 },
    { kind: "code", value: "1234" },
    { kind: "password", value: "mock text" },
  ])("rejects private seed values and invalid lengths", (input) => {
    expect(props.safeParse({ label: "Sign in", ...input }).success).toBe(false);
  });
  it.each(["password", "code"])("makes %s local-only and marks it as a service part", (kind) => {
    const field = { kind, label: "Sign in" };
    const parsed = props.parse(field);
    expect(partTierAt(meta, parsed, "field")).toBe("service");
    expect(affordancesOf(meta, parsed, "f1")).toEqual([]);
    expect(readComponent(components.Field, field, "f1").join("\n")).not.toContain("[f1/field type");
  });
});
