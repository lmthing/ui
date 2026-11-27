import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { renderInstance, styleAt } from "../../test/render";
// prettier-ignore
import { components, createRegistry, planAct, readComponent, secretRevealKey, secretRevealMatches, type CastLike, type Props } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
const { props, meta, examples, fallback, probes } = components.KeyValue;
describe("KeyValue schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  // prettier-ignore
  it("applies defaults and trims text", () => {
    expect(props.parse({ pairs: [{ label: "  Room  ", value: "  Bathroom  " }] })).toEqual({
      arrange: "rows", lead: "icon",
      pairs: [{ label: "Room", value: "Bathroom", tone: "neutral", mark: "none" }],
    });
  });
  // prettier-ignore
  it.each([
    {}, { pairs: [] }, { pairs: Array.from({ length: 7 }, () => ({ label: "Room", value: "Bathroom" })) },
    { pairs: [{ label: "Room" }] }, { pairs: [{ value: "Bathroom" }] },
    { pairs: [{ label: "", value: "Bathroom" }] }, { pairs: [{ label: "   ", value: "Bathroom" }] },
    { pairs: [{ label: "Room", value: "" }] }, { pairs: [{ label: "Room", value: "   " }] },
    { pairs: [{ label: "a".repeat(21), value: "Bathroom" }] },
    { pairs: [{ label: "Room", value: "a".repeat(29) }] }, { pairs: [{ label: "Room", value: 4 }] },
    { pairs: [{ label: "Room", value: "Bathroom", icon: "unknown" }] },
    { pairs: [{ label: "Room", value: "Bathroom", goto: "bathroom" }] },
    { pairs: [{ label: "Room", value: "Bathroom", pixels: 4 }] },
    { style: "cards", pairs: [{ label: "Room", value: "Bathroom" }] },
    { arrange: "strip", pairs: [{ label: "Room", value: "Bathroom" }] },
    { pairs: [{ label: "Room", value: "Bathroom", tone: "info", mark: "new" }] },
    { color: "red", pairs: [{ label: "Room", value: "Bathroom" }] },
    { masked: "true", pairs: [{ label: "Room", value: "Bathroom" }] },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum lengths and count in both arrangements", () => {
    const pair = { label: "a".repeat(20), value: "a".repeat(28), icon: "leaf" };
    for (const arrange of meta.variants.arrange)
      expect(props.safeParse({ arrange, pairs: Array.from({ length: 6 }, () => pair) }).success).toBe(true);
  });
  // prettier-ignore
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>; expectTypeOf<ViewProps["pairs"][number]["id"]>().toEqualTypeOf<string>(); expectTypeOf<ViewProps["pairs"][number]["label"]>().toEqualTypeOf<string>(); expectTypeOf<ViewProps["pairs"][number]["value"]>().toEqualTypeOf<string>(); expectTypeOf<ViewProps>().not.toBeAny(); expectTypeOf<ViewProps>().not.toHaveProperty("color"); expect(props.safeParse({ pairs: [{ label: "Room", value: "Bathroom", id: "r1" }] }).success).toBe(false);
  });
});
describe("KeyValue fallback and metadata", () => {
  it("validates with empty, full, mixed and malformed cast content", () => {
    const seed = { id: "fern", type: "plant", sample: true };
    const long = "x".repeat(80);
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["room", "water_every", "lastWatered"] }],
        items: [
          { ...seed, lastWatered: "Monday", water_every: "7 days", room: "Bathroom" },
          { ...seed, id: "basil", room: "Kitchen" },
        ],
      },
      {
        things: [{ type: "plant", fields: ["room"] }],
        items: [
          { id: "dog", type: "dog", sample: true, room: "Hall" },
          { ...seed, room: "Bathroom" },
        ],
      },
      {
        things: [{ type: "plant", fields: ["name", "room", "light", "water", "notes"] }],
        items: [{ ...seed, name: long, room: long, light: long, water: long, notes: long }],
      },
      {
        things: [{ type: "plant", fields: ["room", "light", "water", "notes"] }],
        items: [{ ...seed, room: 4, light: null, water: " ", notes: {} }],
      },
      { things: [], items: [{ ...seed, room: "Bathroom" }] },
      { things: [{ type: "plant", fields: ["room"] }], items: [] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[1]! }).pairs).toEqual([
      { label: "Room", value: "Bathroom" },
      { label: "Water every", value: "7 days" },
      { label: "Last Watered", value: "Monday" },
    ]);
    expect(fallback({ cast: casts[2]! }).pairs).toEqual([{ label: "Room", value: "Bathroom" }]);
    expect(fallback({ cast: casts[3]! }).pairs).toHaveLength(4);
    for (const index of [0, 4, 5, 6])
      expect(fallback({ cast: casts[index]! }).pairs).toEqual([
        { label: "Item one", value: "0" },
        { label: "Item two", value: "0" },
      ]);
  });
});
describe("KeyValue field labels and metadata", () => {
  // prettier-ignore
  it("keeps each usable field paired with its own value and clips readable labels", () => {
    const field = "long_field_name_for_label";
    const seed = { id: "one", type: "record", sample: false };
    const cast: CastLike = {
      things: [{ type: "record", fields: ["missing", "blank", field, "water-interval"] }],
      items: [{ ...seed, blank: "", [field]: "a".repeat(40), "water-interval": "  Every seven days  " }],
    };
    expect(fallback({ cast }).pairs).toEqual([
      { label: "Long field name for", value: "a".repeat(28) }, { label: "Water interval", value: "Every seven days" },
    ]);
  });
  it("has the declared metadata and well-formed choose and write probes", () => {
    // prettier-ignore
    expect(meta).toMatchObject({ id: "KeyValue", group: "content", region: "body", weight: 2, tier: "phone",
      items: { key: "pairs" }, states: ["filled", "empty", "loading"] });
    expect(meta.actions.items).toEqual({ reveal: ["toggle"], copy: ["copy"] });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("List");
    expect(meta.pick).toContain("Stats");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "List")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "KeyValue")).toBeDefined();
    expect(probes.some((probe) => probe.kind === "write" && probe.expect === "KeyValue")).toBe(true);
  });
  // prettier-ignore
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("KeyValue"); expect(registry.schema("KeyValue")).toBe(props);
    expect(registry.resolve("key-value")).toBe("KeyValue");
    expect(registry.resolve("k-e-y-v-a-l-u-e")).toBe("KeyValue");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});
// prettier-ignore
it("masks the value in both layouts and never publishes it to the reader, even after a host reveal", () => {
  const value = "DEMO-042", pairs = [{ label: "Entry code", value }];
  expect(readComponent(components.KeyValue, { pairs }, "c1").join()).toContain(value);
  for (const arrange of ["rows", "grid"] as const) {
    const input = { pairs, masked: true, arrange };
    for (const state of ["filled", "loading"] as const) {
      const html = renderInstance("KeyValue", input, state, { preset: "calm", mode: "light", accent: "moss" });
      expect(html).not.toContain(value);
      expect(html.includes('data-testid="home/c1/r1/reveal"')).toBe(state === "filled");
    }
    const screen = { id: "home", components: [{ id: "c1", c: "KeyValue", ...input }] };
    const writeClipboard = vi.fn();
    const controller = createScreenController({ screen, defs: { KeyValue: components.KeyValue }, writeClipboard });
    const reveal = { address: "c1/r1/reveal", action: "toggle" } as const;
    const copy = { address: "c1/r1/copy", action: "copy" } as const;
    controller.registerCopyTarget("home/c1/r1/copy", value);
    expect(controller.act(reveal).ok).toBe(true);
    const grantKey = secretRevealKey("home/c1/r1/reveal");
    const grant = controller.store.get(grantKey);
    expect(secretRevealMatches(grant, ["Entry code", value])).toBe(true);
    const replacement = { ...screen, components: [{ ...screen.components[0]!, pairs: [{ label: "Entry code", value: "DEMO-043" }] }] };
    expect(secretRevealMatches(grant, ["Entry code", "DEMO-043"])).toBe(false);
    const next = planAct(replacement, { KeyValue: components.KeyValue }, controller.store.snapshot(), [reveal]);
    expect(next.ok && secretRevealMatches(next.values[grantKey], ["Entry code", "DEMO-043"])).toBe(true);
    expect(JSON.stringify(controller.store.snapshot())).not.toContain(value);
    expect(controller.act(copy).ok).toBe(true);
    expect(writeClipboard).not.toHaveBeenCalled();
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(writeClipboard).toHaveBeenCalledExactlyOnceWith(value);
    const read = controller.read();
    expect(read).toContain('"Entry code" · (secret)'); expect(read).not.toContain(value);
    expect(controller.act(reveal).ok).toBe(true);
    expect(controller.store.get(grantKey)).toBeUndefined();
    controller.dispose();
  }
});
// prettier-ignore
function renderPairs(arrange: "rows" | "grid", count: number, loading = false, hideIcons = false) {
  const pairs = Array.from({ length: count }, (_, index) => ({
    label: `Fact ${index}`, value: "a".repeat(28), ...(index % 2 ? {} : { icon: "leaf" }),
  }));
  return renderInstance("KeyValue", { arrange, pairs, ...(hideIcons ? { lead: "none" } : {}) },
    loading ? "loading" : "filled", { preset: "calm", mode: "light", accent: "moss" });
}
describe("KeyValue receipt", () => {
  it("keeps record identity and full repair task on separate paired addresses", () => {
    const input = examples.at(-1)!;
    const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
    const html = renderInstance("KeyValue", input, "filled", theme);
    expect(html).toContain("Swap out the derailleur cage");
    expect(html).toContain("LC-104");
    expect(html).toContain('data-testid="home/c1/r1/icon"');
    expect(html).not.toContain('data-testid="home/c1/r2/icon"');
    expect(styleAt(html, "home/c1/r4/value")).toBe(styleAt(html, "home/c1/r5/value"));
    const read = readComponent(components.KeyValue, input, "c1").join();
    expect(read).toContain('"Reference" · "LC-104"');
    expect(read).toContain('"Task" · "Swap out the derailleur cage"');
    expect(read.indexOf("Last updated")).toBeLessThan(read.indexOf("Reference"));
  });
});

describe("KeyValue rendering", () => {
  it.each(["rows", "grid"] as const)(
    "emphasises only the status value in %s without changing addresses",
    (arrange) => {
      const pairs = [
        { label: "Order", value: "LC-104" },
        { label: "Status", value: "Ready for pickup", status: true },
      ];
      const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
      expect(props.safeParse({ pairs: [...pairs, pairs[1]] }).success).toBe(false);
      expect(props.safeParse({ pairs, masked: true }).success).toBe(false);
      const plain = renderInstance(
        "KeyValue",
        { pairs: [pairs[0], { ...pairs[1], status: false }], arrange },
        "filled",
        theme,
      );
      const html = renderInstance("KeyValue", { pairs, arrange }, "filled", theme);
      expect(html.indexOf("LC-104")).toBeLessThan(html.indexOf("Ready for pickup"));
      expect(styleAt(html, "home/c1/r2/value")).not.toBe(styleAt(plain, "home/c1/r2/value"));
      expect(styleAt(html, "home/c1/r1/value")).toBe(styleAt(plain, "home/c1/r1/value"));
    },
  );
  it("hides only the declared icon parts and keeps pair addresses", () => {
    const html = renderPairs("grid", 3, false, true);
    expect(meta.variantParts["lead.none"]).toEqual({ hides: ["icon"] });
    expect(html).not.toMatch(/data-testid="home\/c1\/r\d+\/icon"/);
    for (const id of ["r1", "r2", "r3"]) expect(html).toContain(`data-testid="home/c1/${id}/value"`);
  });
  // prettier-ignore
  it.each(["rows", "grid"] as const)("draws each static pair once in %s at every allowed count", (style) => {
    for (let count = 1; count <= 6; count++) {
      const html = renderPairs(style, count);
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      expect(html).not.toMatch(/role="(?:link|button)"/);
      for (let index = 1; index <= count; index++) {
        for (const part of ["root", "label", "value"])
          expect(html.match(new RegExp(`data-testid="home/c1/r${index}/${part}"`, "g"))).toHaveLength(1);
        expect(html.includes(`data-testid="home/c1/r${index}/icon"`)).toBe(index % 2 === 1);
        if (style === "grid") expect(html).toMatch(new RegExp(`data-testid="home/c1/r${index}/value"[^>]*>[^<]*</span></div></div>`));
      }
    }
  });
  // prettier-ignore
  it.each(["rows", "grid"] as const)("loads both text placeholders in %s at every count", (style) => {
    for (let count = 1; count <= 6; count++) {
      const html = renderPairs(style, count, true); expect(html.match(/aria-busy="true"/g)).toHaveLength(2 * count);
      expect(html).not.toMatch(/data-testid="home\/c1\/r\d+\/(label|value|icon)"/);
    }
  });
});
