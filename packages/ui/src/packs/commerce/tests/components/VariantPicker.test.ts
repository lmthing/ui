import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  stampItemIds,
  swatchNames,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const component = components.VariantPicker;
const { meta, props, examples, fallback, probes } = component;
const swatches = examples[0]!;
const named = examples[2]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const castOf = (name: unknown): CastLike => ({
  things: [{ type: "sample_record", fields: ["name"] }],
  items: [{ id: "one", type: "sample_record", sample: true, name }],
});

describe("VariantPicker schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and defaults to named, card and full detail without selecting", () => {
    expect(props.parse({ ...named, label: "  Finish  " })).toMatchObject({
      label: "Finish",
      style: "named",
      surface: "card",
      detail: "full",
    });
    expect(props.parse(named).at).toBeUndefined();
  });
  it.each([
    { label: "" },
    { label: "a".repeat(17) },
    { options: [] },
    { options: [named.options[0]] },
    { options: Array(7).fill(named.options[0]) },
    { at: -1 },
    { at: 1.5 },
    { at: 2 },
    { at: 6 },
    { style: "swatch" },
    { style: "outlined" },
    { detail: "short" },
    { density: "dense" },
    { surface: "tinted" },
    { color: "red" },
  ])("rejects invalid props %j", (change) =>
    expect(props.safeParse({ ...named, ...change }).success).toBe(false),
  );
  it.each([
    { id: "r1" },
    { label: " ".repeat(3) },
    { label: "a".repeat(17) },
    { available: undefined },
    { available: false },
    { swatch: undefined },
    { extra: 0.001 },
    { extra: Infinity },
  ])("rejects invalid selected swatch %j", (change) => {
    const options = [{ ...swatches.options[0], ...change }, ...swatches.options.slice(1)];
    expect(props.safeParse({ ...swatches, options }).success).toBe(false);
  });
  it("accepts 16-character labels, six options, negative cents and the last valid index", () => {
    const label = "a".repeat(16);
    const options = Array(6).fill({ label, extra: -1.25, available: true });
    expect(props.safeParse({ label, options, at: 5 }).success).toBe(true);
    expect(props.safeParse({ ...swatches, style: "size" }).success).toBe(false);
    expectTypeOf<Props<typeof props, typeof meta>["options"][number]["id"]>().toEqualTypeOf<string>();
  });
});

describe("VariantPicker fallback and contract", () => {
  it("snaps unrecognized swatches to the fixed palette rather than drawing raw colors", () => {
    const options = [{ ...swatches.options[0], swatch: "#778844" }, ...swatches.options.slice(1)];
    expect(swatchNames).toContain(props.parse({ ...swatches, options }).options[0]?.swatch);
  });
  it("uses cast labels and pads small or invalid casts with neutral placeholders", () => {
    const empty = { things: [], items: [] };
    const full = castOf("First option");
    const malformed = castOf(42);
    for (const cast of [empty, full, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).options.map(({ label }) => label)).toEqual(["Item one", "Item two"]);
    expect(fallback({ cast: full })).toEqual({
      label: "sample record",
      options: [
        { label: "First option", available: true },
        { label: "Item two", available: true },
      ],
    });
    expect(fallback({ cast: malformed }).options[0]?.label).toBe("Item one");
  });
  it("keeps tier, states, core-first and variant probes, and the pack readiness gate", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", states: ["filled"] });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "VariantPicker",
      "Choice",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "write",
        expect: "VariantPicker",
        variant: { axis: "detail", value: "brief" },
      }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "read",
        expect: { address: "v1/r2", action: "select" },
      }),
    );
    expect(createRegistry({ packs: ["commerce"] }).ids.includes("VariantPicker")).toBe(packReady("commerce"));
    expect(meta.read(props.parse(swatches), "loading", "en")).toEqual([]);
  });
});

describe("VariantPicker parts and read/act", () => {
  it("draws one root, labelled radios, addressed dots, and only the applicable price and stock parts", () => {
    const html = renderInstance("VariantPicker", swatches, "filled", theme);
    const parts = addressedElements(html);
    const address = (part: string) => `home/c1/${part}`;
    const itemParts = ["r1", "r2", "r3"].flatMap((id) =>
      ["root", "label", "swatch"].map((part) => `${id}/${part}`),
    );
    expect([...parts.keys()].sort()).toEqual(
      [...meta.parts, ...itemParts, "r2/extra", "r3/available"].map(address).sort(),
    );
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(parts.get(address("options"))?.attributes).toContain('role="radiogroup"');
    expect(parts.get(address("r1/root"))?.attributes).toContain('aria-checked="true"');
    expect(parts.get(address("r2/root"))?.attributes).toContain('role="radio"');
    expect(parts.get(address("r3/root"))?.attributes).toContain('aria-disabled="true"');
  });
  it("hides only price differences in brief and omits dots in non-swatch styles", () => {
    const brief = { ...swatches, detail: "brief" } as const;
    const read = (input: unknown) => readComponent(component, input, "v1").join("\n");
    const render = (input: unknown) => renderInstance("VariantPicker", input, "filled", theme);
    expect(read(swatches)).toContain("Clay · +$2");
    expect(read(brief)).not.toContain("+$2");
    expect(read(brief)).toContain("Cream · Sold out");
    const fullParts = [...addressedElements(render(swatches)).keys()];
    expect([...addressedElements(render(brief)).keys()]).toEqual(
      fullParts.filter((address) => !address.endsWith("/extra")),
    );
    for (const input of examples.slice(1).filter((item) => item.style !== "shade")) {
      expect(render(input)).not.toContain('/swatch"');
      expect(render(input)).not.toContain('aria-checked="true"');
    }
  });
  it("selects only available roots and cannot select a different index through an available root", () => {
    const stamped = stampItemIds(meta, props.parse(swatches));
    expect(affordancesOf(meta, stamped, "v1").map(({ address, action }) => [address, action])).toEqual([
      ["v1/r1", "select"],
      ["v1/r2", "select"],
    ]);
    const runtime = createScreenController({
      screen: { id: "home", components: [{ id: "v1", c: "VariantPicker", ...swatches }] },
      defs: components,
      requireMounted: false,
    });
    try {
      expect(runtime.press("home/v1/r2/root").ok).toBe(true);
      expect(runtime.store.get("home/v1/$at")).toBe(1);
      expect(runtime.act({ address: "home/v1/r2", action: "select", value: 0 }).ok).toBe(false);
      for (const part of ["r3/root", "r2/label", "r2/swatch", "r2/extra", "r3/available", "options"])
        expect(runtime.press(`home/v1/${part}`).ok).toBe(false);
      expect(runtime.store.get("home/v1/$at")).toBe(1);
      expect(runtime.press("home/v1/r1/root").ok).toBe(true);
      expect(runtime.store.get("home/v1/$at")).toBe(0);
    } finally {
      runtime.dispose();
    }
  });
});
