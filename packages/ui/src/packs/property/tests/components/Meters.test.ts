import { describe, expect, expectTypeOf, it, vi } from "vitest";
// prettier-ignore
import { affordancesOf, components, createRegistry, packReady, readComponent, stampItemIds, type CastLike, type Props } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { props, meta, examples, fallback, probes } = components.Meters;
const register = examples[0]!;
const history = examples[1]!;
const older = register.readings[0]!;
const newer = register.readings[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const photo = { ...newer, photo: "local:2" };
const text = (input: unknown) => readComponent(components.Meters, input, "m1").join("\n");

describe("Meters schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("applies defaults, uses validator IDs only for view props, and accepts out-of-order samples", () => {
    const input = { ...register, readings: [newer, older] };
    expect(props.parse(input)).toMatchObject({ style: "register", surface: "card", detail: "full" });
    const stamped = stampItemIds(meta, props.parse(input));
    expect(stamped.entries.map((row) => (row as { id?: string }).id)).toEqual(["r1", "r2"]);
    expectTypeOf<Props<typeof props, typeof meta>["entries"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Props<typeof props, typeof meta>>().not.toHaveProperty("color");
    expect(text(input)).toContain("46\u00a0kWh used · 31 days");
  });

  it.each([
    { meters: [] },
    { meters: Array.from({ length: 7 }, (_, i) => ({ ...register.meters[0], meterRef: `meter_${i}` })) },
    { meters: [register.meters[0], register.meters[0]] },
    { meters: [{ ...register.meters[0], title: "x".repeat(33) }] },
    { meters: [{ ...register.meters[0], utility: "heating" }] },
    { meters: [{ ...register.meters[0], unit: "gallons" }] },
    { readings: [{ ...older, id: "r3" }] },
    { readings: [{ ...older, value: -1 }] },
    { readings: [{ ...older, value: Infinity }] },
    { readings: [{ ...older, meterRef: "unknown" }] },
    { readings: [{ ...older, at: "2026-10-18T08:00:00" }] },
    { readings: [{ ...older, at: "2026-02-30T08:00:00Z" }] },
    { readings: [{ ...older, at: "2999-01-01T08:00:00Z" }] },
    { readings: [older, { ...newer, readingRef: older.readingRef }] },
    { readings: [older, { ...newer, at: "2026-10-18T09:00:00+01:00" }] },
    { readings: [newer, { ...older, value: newer.value + 1 }] },
    { readings: [{ ...older, photo: "https://example.org/photo" }] },
    { readings: Array(25).fill(older) },
    { unitRef: "a".repeat(33) },
    { addGoto: "bad id" },
    { style: "compact" },
    { meterRef: older.meterRef },
    { color: "red" },
    { pixels: 4 },
  ])("rejects invalid input %j", (invalid) =>
    expect(props.safeParse({ ...register, ...invalid }).success).toBe(false),
  );
});

describe("Meters count bounds", () => {
  it("accepts six meters and twenty-four readings with exact limits and adjacent equal values", () => {
    const meters = Array.from({ length: 6 }, (_, i) => ({
      ...register.meters[0]!,
      meterRef: `${"a".repeat(31)}${i}`,
      title: "T".repeat(32),
    }));
    const readings = Array.from({ length: 24 }, (_, i) => ({
      ...older,
      meterRef: meters[0]!.meterRef,
      readingRef: `sample_${i}`,
      at: `2025-10-${String(i + 1).padStart(2, "0")}T08:00:00Z`,
      value: 0,
    }));
    expect(props.safeParse({ ...register, meters, readings, unitRef: "a".repeat(32) }).success).toBe(true);
    expect(props.safeParse({ ...register, readings: [] }).success).toBe(true);
  });
});

describe("Meters fallback and contract", () => {
  it("uses cast titles and neutral placeholders and never invents readings", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "record", fields: ["name"] }],
        items: [{ id: "one", type: "record", sample: true, name: "Meter A" }],
      },
      { things: [], items: [{ id: "one", type: "record", sample: true, name: 4 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[1]! }).meters[0]?.title).toBe("Meter A");
    for (const cast of [casts[0]!, casts[2]!])
      expect(fallback({ cast })).toMatchObject({ readings: [], meters: [{ title: "Item one" }] });
  });

  it("keeps the core near miss, phone tier, dense limit and briefing probe", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", dense: true, weight: 3 });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Meters",
      "Field",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "m1/add", action: "press" } }),
    );
    expect(createRegistry({ packs: ["property"] }).ids.includes("Meters")).toBe(packReady("property"));
  });
});

describe("Meters states, parts and read/act", () => {
  it.each([
    ["empty", "No walks yet", true],
    ["loading", "Loading", false],
    ["success", "Reading saved", false],
    ["error", "Reading not saved", false],
  ] as const)("draws %s with only the available controls", (state, message, canAdd) => {
    const html = renderInstance("Meters", register, state, theme, "walk");
    const addressed = addressedElements(html);
    expect(addressed.has("home/c1/root")).toBe(true);
    expect(addressed.has("home/c1/r1/root")).toBe(false);
    expect(html).toContain(message);
    expect(addressed.has("home/c1/add")).toBe(canAdd);
    expect(
      affordancesOf(meta, stampItemIds(meta, props.parse(register)), "m1", {}, state).map(
        ({ address }) => address,
      ),
    ).toEqual(canAdd ? ["m1/add"] : []);
  });

  it("shows register values and hides the previous value in brief mode without removing data", () => {
    for (const detail of ["full", "brief"] as const) {
      const input = { ...register, detail };
      const parts = addressedElements(renderInstance("Meters", input, "filled", theme));
      expect(parts.get("home/c1/r1/root")?.attributes).toContain('role="button"');
      for (const part of ["title", "latest", "usage"]) expect(parts.has(`home/c1/r1/${part}`)).toBe(true);
      expect(parts.has("home/c1/r1/previous")).toBe(detail === "full");
      expect(text(input).includes("Previous")).toBe(detail === "full");
      expect(text(input)).toContain("46\u00a0kWh used");
      expect(parts.has("home/c1/r2/usage")).toBe(false);
      expect(props.parse(input).readings).toEqual(register.readings);
    }
  });

  it("shows dated history, only existing evidence and no usage on the first reading", () => {
    const parts = addressedElements(renderInstance("Meters", history, "filled", theme));
    expect(parts.get("home/c1/r1/root")?.attributes).toContain('role="radio"');
    expect(parts.has("home/c1/r3/at")).toBe(true);
    expect(parts.has("home/c1/r3/value")).toBe(true);
    expect(parts.has("home/c1/r3/usage")).toBe(false);
    expect(parts.has("home/c1/r3/photo")).toBe(false);
    expect(parts.has("home/c1/r4/usage")).toBe(true);
    expect(parts.has("home/c1/r4/evidence")).toBe(true);
    expect(parts.get("home/c1/r4/photo")?.attributes).toContain('role="button"');
    expect(text(history)).toContain("[m1/r4/photo press]");
    expect(text(history)).toContain("3.5\u00a0m³ used · 31 days");
  });
});

describe("Meters actions", () => {
  it("opens selected history, gates evidence by meter and routes add without requesting capture", () => {
    const input = { ...register, readings: [older, photo, register.readings[2]!] };
    const onLink = vi.fn(),
      onAction = vi.fn(),
      requestPhoto = vi.fn();
    const controller = createScreenController({
      screen: { id: "home", components: [{ id: "m1", c: "Meters", ...input }] },
      defs: components,
      onLink,
      onAction,
      requestPhoto,
      requireMounted: false,
    });
    expect(controller.press("home/m1/r4/photo").ok).toBe(false);
    expect(controller.press("home/m1/r1/root").ok).toBe(true);
    expect(controller.store.get("home/m1/$meterRef")).toBe(older.meterRef);
    expect(controller.press("home/m1/r3/photo").ok).toBe(false);
    expect(controller.press("home/m1/r4/photo").ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith({ address: "home/m1/r4/photo", action: "press" });
    expect(controller.press("home/m1/r2/root").ok).toBe(true);
    expect(controller.press("home/m1/r4/photo").ok).toBe(false);
    expect(controller.press("home/m1/add").ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("add_reading", "home/m1/add");
    expect(requestPhoto).not.toHaveBeenCalled();
    const selected = readComponent(components.Meters, input, "m1", "filled", {
      "m1/$meterRef": "willow_water",
    }).join("\n");
    expect(selected).toContain("Reading history");
    expect(selected).not.toContain("1246");
    expect(selected).not.toContain("[m1/r4/photo press]");
    controller.dispose();
  });
});
