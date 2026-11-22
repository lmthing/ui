import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  loadingLabel,
  packReady,
  planAct,
  readComponent,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const def = components.OrderSummary;
const { props, meta, examples, fallback, probes } = def;
const pickup = examples[0]!;
const delivery = examples[1]!;
const line = pickup.lines[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const instance = { id: "o1", c: "OrderSummary", ...pickup };
const screen = { id: "home", components: [instance] };

describe("OrderSummary schema boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("accepts the exact item and text limits with default variants", () => {
    const max = { name: "x".repeat(28), qty: 99, price: 123.45 };
    expect(
      props.parse({
        number: "x".repeat(12),
        place: "x".repeat(60),
        date: "2028-02-29",
        mode: "table",
        lines: Array.from({ length: 8 }, () => max),
      }),
    ).toMatchObject({ surface: "card", detail: "full", lines: Array.from({ length: 8 }, () => max) });
    expectTypeOf<Props<typeof props, typeof meta>["lines"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { ...pickup, number: "x".repeat(13) },
    { ...pickup, number: " " },
    { ...pickup, date: "2026-02-29" },
    { ...pickup, date: "20 November 2026" },
    { ...pickup, mode: "shipping" },
    { ...pickup, place: "x".repeat(61) },
    { ...pickup, lines: [] },
    { ...pickup, lines: Array.from({ length: 9 }, () => line) },
    { ...pickup, total: 100 },
    { ...pickup, goto: "checkout" },
    { ...pickup, color: "red" },
    { ...pickup, density: "roomy" },
    { ...pickup, surface: "tinted" },
    { ...pickup, detail: "collapsed" },
    ...[
      { name: " " },
      { name: "x".repeat(29) },
      { id: "r1" },
      { qty: 0 },
      { qty: 100 },
      { qty: 1.5 },
      { price: -1 },
      { price: 1.005 },
      { price: Infinity },
      { price: "$12" },
      { currency: "USD" },
    ].map((patch) => ({ ...pickup, lines: [{ ...line, ...patch }] })),
  ])("rejects invalid wire data", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("OrderSummary fallback and probes", () => {
  it("uses up to three bounded titles from the cast", () => {
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["label"] }],
      items: Array.from({ length: 4 }, (_, index) => ({
        id: `plant_${index}`,
        type: "plant",
        sample: true,
        label: index ? "x".repeat(80) : "Fern",
      })),
    };
    const input = fallback({ cast });
    expect(input.lines).toHaveLength(3);
    expect(input.lines[0]).toEqual({ name: "Fern", qty: 1, price: 0 });
    expect(props.safeParse(input).success).toBe(true);
  });

  it.each([
    { things: [], items: [] },
    { things: [], items: [{ id: "item", type: "plant", sample: true, name: 4 }] },
  ] satisfies CastLike[])("uses neutral placeholders without usable cast labels", (cast) => {
    const input = fallback({ cast });
    expect(input.lines).toEqual([{ name: "Item one", qty: 1, price: 0 }]);
    expect(input.number).toBe("0");
    expect(props.safeParse(input).success).toBe(true);
  });

  it("keeps the pack gate, phone tier and required choose/write/read coverage", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", dense: true, weight: 3 });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "OrderSummary",
      "KeyValue",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "o1/reorder", action: "press" } }),
    );
  });
});

describe("OrderSummary states and parts", () => {
  it("draws the receipt, optional place, addressed lines and a named reorder button", () => {
    const html = renderInstance("OrderSummary", pickup, "filled", theme);
    const addresses = addressedElements(html);
    for (const part of meta.parts) expect(addresses.has(`home/c1/${part}`)).toBe(true);
    for (const part of meta.items.parts) expect(addresses.has(`home/c1/r1/${part}`)).toBe(true);
    expect(elementAt(html, "home/c1/reorder").attributes).toMatch(/role="button".*aria-label="Reorder"/);
    const withoutPlace = renderInstance("OrderSummary", delivery, "filled", theme);
    expect(addressedElements(withoutPlace).has("home/c1/place")).toBe(false);
  });

  it("hides only unit prices in brief detail while retaining authored prices", () => {
    const brief = { ...pickup, detail: "brief" };
    const fullAddresses = addressedElements(renderInstance("OrderSummary", pickup, "filled", theme));
    const briefAddresses = addressedElements(renderInstance("OrderSummary", brief, "filled", theme));
    expect([...briefAddresses.keys()]).toEqual(
      [...fullAddresses.keys()].filter((p) => !p.endsWith("/price")),
    );
    expect(props.parse(brief).lines).toEqual(pickup.lines);
  });

  it("loads in place without showing receipt parts or an active reorder button", () => {
    const html = renderInstance("OrderSummary", pickup, "loading", theme);
    expect(html).toContain(loadingLabel);
    expect([...addressedElements(html).keys()]).toEqual(["home/c1/root"]);
    const runtime = createScreenController({
      screen: { ...screen, components: [{ ...instance, state: "loading" }] },
      defs: components,
    });
    expect(runtime.act({ address: "o1/reorder", action: "press" })).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});

describe("OrderSummary read and act", () => {
  it("reads fulfillment, quantities and computed amounts with only one action", () => {
    const read = readComponent(def, pickup, "o1").join("\n");
    for (const text of ["Order #PL-104", "Pickup · Glasshouse counter", "Qty 2", "$12.00 each", "$41.25"])
      expect(read).toContain(text);
    expect(read.match(/\[o1\S* press[^\]]*\]/g)).toEqual(["[o1/reorder press]"]);
    const brief = readComponent(def, { ...pickup, detail: "brief" }, "o1").join("\n");
    expect(brief).not.toContain("/ each");
    expect(brief).toContain("$41.25");
    expect(planAct(screen, components, {}, [{ address: "o1/r1", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });

  it("dispatches reorder to the host without navigating or requesting confirmation", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    const action = { address: "home/o1/reorder", action: "press" } as const;
    expect(runtime.act(action)).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith(action);
    expect(onLink).not.toHaveBeenCalled();
  });
});
