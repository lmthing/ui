import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  photoLabels,
  placeholderDetail,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Camera;

describe("Camera schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies the photo default and trims the hint", () => {
    expect(props.parse({ hint: "  Point at the subject  " })).toEqual({
      kind: "photo",
      hint: "Point at the subject",
    });
  });
  it.each([
    {},
    { hint: "" },
    { hint: "   " },
    { hint: "a".repeat(49) },
    { hint: 4 },
    { hint: "Aim", kind: "video" },
    { hint: "Aim", kind: null },
    { hint: "Aim", color: "red" },
    { hint: "Aim", background: "#000000" },
    { hint: "Aim", pixels: 44 },
    { hint: "Aim", shutter: "Take" },
    { hint: "Aim", id: "c1" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it.each(["photo", "scan"] as const)("accepts the exact hint limit in %s mode", (kind) => {
    expect(props.safeParse({ kind, hint: "a".repeat(48) }).success).toBe(true);
  });
  it("keeps strict wire props and typed view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["kind"]>().toEqualTypeOf<"photo" | "scan">();
    expectTypeOf<ViewProps["hint"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Camera fallback", () => {
  it("validates empty, full, long, mixed and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "specimen", fields: ["name"] }],
        items: [{ id: "one", type: "specimen", sample: true, name: "Sample" }],
      },
      {
        things: [{ type: "  identity_tag  ", fields: [] }],
        items: [{ id: "one", type: "other", sample: false, name: "Different subject" }],
      },
      { things: [{ type: "x".repeat(80), fields: [] }], items: [] },
      {
        things: [{ type: " ", fields: ["name"] }],
        items: [{ id: "bad", type: "other", sample: false, name: 4 }],
      },
      { things: [], items: [{ id: "bad", type: "other", sample: false, name: null }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({ kind: "photo", hint: placeholderDetail });
    expect(fallback({ cast: casts[1]! })).toEqual({ kind: "photo", hint: "specimen" });
    expect(fallback({ cast: casts[2]! })).toEqual({ kind: "photo", hint: "identity tag" });
    expect(fallback({ cast: casts[3]! }).hint).toHaveLength(48);
    expect(fallback({ cast: casts[4]! }).hint).toBe(placeholderDetail);
    expect(fallback({ cast: casts[5]! }).hint).toBe(placeholderDetail);
  });
});

describe("Camera metadata and probes", () => {
  it.each(["photo", "scan"] as const)("offers only the shutter press for %s", (kind) => {
    expect(affordancesOf(meta, props.parse({ kind, hint: "Aim at the subject" }), "c1")).toEqual([
      { address: "c1/shutter", part: "shutter", action: "press", detail: "" },
    ]);
  });
  it("has the exact contract and well-formed choose, write and read probes", () => {
    expect(meta).toMatchObject({
      id: "Camera",
      group: "beyond",
      region: "body",
      weight: 3,
      tier: "ok",
      parts: ["root", "viewfinder", "hint", "shutter"],
      states: ["filled"],
      actions: { parts: { shutter: ["press"] } },
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Photo");
    expect(meta.pick).toContain("Field");
    const choose = probes.filter((probe) => probe.kind === "choose");
    expect(choose).toHaveLength(2);
    expect(choose.some((probe) => probe.expect === "Camera")).toBe(true);
    expect(choose.some((probe) => probe.expect === "Photo")).toBe(true);
    for (const probe of choose) {
      for (const word of [meta.id]) expect(probe.need.toLowerCase()).not.toContain(word.toLowerCase());
    }
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Camera" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Take the photo",
      expect: { address: "c1/shutter", action: "press" },
    });
  });
  it("registers its data-only definition and ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Camera");
    expect(registry.schema("Camera")).toBe(props);
    expect(registry.resolve("c-a-m-e-r-a")).toBe("Camera");
    expect(registry.resolve("c-a-m-e-r-a")).toBe("Camera");
  });
});

describe("Camera rendering and reading", () => {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  it.each(["photo", "scan"] as const)("draws and reads the %s shutter with unique parts", (kind) => {
    const input = { kind, hint: "Aim at the subject" };
    const html = renderInstance("Camera", input, "filled", theme);
    const label = kind === "scan" ? photoLabels.scan : photoLabels.take;
    for (const part of meta.parts) {
      expect(html.match(new RegExp(`data-testid="home/c1/${part}"`, "g"))).toHaveLength(1);
    }
    const shutter = html.match(/<[^>]*data-testid="home\/c1\/shutter"[^>]*>/)?.[0];
    expect(shutter).toContain('role="button"');
    expect(shutter).toContain(`aria-label="${label}"`);
    const read = readComponent(components.Camera, input, "c1").join("\n");
    expect(read).toContain(label);
    expect(read).toContain(input.hint);
    expect(read).toContain("c1/shutter");
    expect(meta.read(props.parse(input), "loading")).toEqual([]);
  });
});
