import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  loadingLabel,
  packReady,
  planAct,
  readComponent,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, hasStepTarget, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const def = components.Cart;
const { props, meta, examples, fallback, probes } = def;
const basket = examples[0]!;
const line = basket.lines[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const cart = { id: "c1", c: "Cart", ...basket };
const screen = { id: "home", components: [cart] };
const remove = { address: "home/c1/r2/remove", action: "press" } as const;
const promo = { address: "home/c1/promo", action: "type", value: "GROW10" } as const;

describe("Cart contract and boundaries", () => {
  it.each(examples)("accepts an example", (example) => expect(props.safeParse(example).success).toBe(true));

  it("accepts eight lines at the maximum lengths and quantity, including zero delivery", () => {
    const lines = Array.from({ length: 8 }, () => ({
      name: "x".repeat(28),
      variant: "x".repeat(20),
      qty: 99,
      photo: "local:1",
      price: 32.05,
    }));
    expect(props.parse({ lines, delivery: 0 })).toMatchObject({ surface: "card", detail: "full", lines });
    expectTypeOf<Props<typeof props, typeof meta>["lines"][number]["id"]>().toEqualTypeOf<string>();
  });

  // prettier-ignore
  it.each([
    {}, { ...basket, lines: [] }, { ...basket, lines: Array.from({ length: 9 }, () => line) },
    ...[
      { delivery: -1 }, { delivery: 1.005 }, { delivery: "$3" }, { subtotal: 25 }, { total: 27 },
      { promo: "GROW10" }, { color: "red" }, { surface: "tinted" }, { density: "roomy" }, { detail: "collapsed" },
    ].map((patch) => ({ ...basket, ...patch })),
    ...[
      { name: " " }, { name: "x".repeat(29) }, { variant: "x".repeat(21) }, { id: "r1" },
      { qty: 0 }, { qty: 100 }, { qty: 1.5 }, { photo: undefined }, { photo: "https://example.com/fern" },
      { price: -1 }, { price: 1.005 }, { price: Infinity }, { price: "$12" }, { lineTotal: 24 },
    ].map((patch) => ({ ...basket, lines: [{ ...line, ...patch }] })),
  ])("rejects invalid wire data", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("Cart fallback and probes", () => {
  it("uses up to three bounded cast titles", () => {
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["label"] }],
      items: Array.from({ length: 4 }, (_, i) => ({
        id: `item_${i}`,
        type: "plant",
        sample: true,
        label: i === 0 ? "Fern" : "x".repeat(80),
      })),
    };
    const input = fallback({ cast });
    expect(input.lines).toHaveLength(3);
    expect(input.lines[0]).toEqual({ name: "Fern", photo: "local:1", qty: 1, price: 0 });
    expect(props.safeParse(input).success).toBe(true);
  });

  it.each([
    { things: [], items: [] },
    { things: [], items: [{ id: "plant", type: "plant", sample: true, name: 3 }] },
  ] satisfies CastLike[])("uses shared placeholders when no usable label is available", (cast) => {
    const input = fallback({ cast });
    expect(input.lines).toEqual([{ name: "Item one", photo: "local:1", qty: 1, price: 0 }]);
    expect(props.safeParse(input).success).toBe(true);
  });

  it("keeps the pack gate, phone tier, confirmation and core-first probes", () => {
    expect(meta).toMatchObject({ tier: "phone", dense: true, weight: 3, confirmParts: ["remove"] });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "Cart",
      "List",
    ]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "Cart" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "c1/r2/remove", action: "press" } }),
    );
  });
});

describe("Cart states and parts", () => {
  it("draws addressed lines and subtotal, delivery and total; names the controls per row", () => {
    const html = renderInstance("Cart", basket, "filled", theme);
    const addresses = addressedElements(html);
    for (const part of ["root", "promo", "subtotal", "delivery", "total"])
      expect(addresses.has(`home/c1/${part}`)).toBe(true);
    for (const part of meta.items.parts) expect(addresses.has(`home/c1/r1/${part}`)).toBe(true);
    expect(addresses.get("home/c1/r1/price")?.text).toContain("$24.00");
    expect(addresses.get("home/c1/total")?.text).toContain("$37.00");
    expect(elementAt(html, "home/c1/promo").attributes).toMatch(/aria-label="Promo code"/);
    expect(elementAt(html, "home/c1/r2/remove").attributes).toMatch(/aria-label="Remove Basil planter"/);
    expect(hasStepTarget(elementAt(html, "home/c1/r1/qty"), "increment")).toBe(true);
    expect(hasStepTarget(elementAt(html, "home/c1/r1/qty"), "decrement")).toBe(true);
    expect(html).toContain('aria-label="One more, Fern pot"');
    expect(addresses.has("home/c1/r2/variant")).toBe(false);
  });

  it("omits absent delivery, but keeps zero delivery visible", () => {
    for (const delivery of [undefined, 0]) {
      const html = renderInstance("Cart", { ...basket, delivery }, "filled", theme);
      const addresses = addressedElements(html);
      expect(addresses.has("home/c1/delivery")).toBe(delivery === 0);
      expect(addresses.get("home/c1/total")?.text).toContain("$34.00");
    }
  });

  it("hides only the variant note in brief detail, without renumbering rows", () => {
    const brief = { ...basket, detail: "brief" };
    const fullParts = [...addressedElements(renderInstance("Cart", basket, "filled", theme)).keys()];
    const briefParts = [...addressedElements(renderInstance("Cart", brief, "filled", theme)).keys()];
    expect(briefParts).toEqual(fullParts.filter((key) => !key.endsWith("/variant")));
    expect(readComponent(def, brief, "c1").join("\n")).not.toContain("Olive");
  });

  it.each(["empty", "loading"] as const)("shows a non-interactive %s state", (state) => {
    const html = renderInstance("Cart", basket, state, theme, "product");
    expect(html).toContain(state === "empty" ? emptyLine("product") : loadingLabel);
    expect([...addressedElements(html).keys()]).toEqual(
      state === "empty" ? ["home/c1/root", "home/c1/empty"] : ["home/c1/root"],
    );
    const runtime = createScreenController({
      screen: { ...screen, components: [{ ...cart, state }] },
      defs: components,
    });
    expect(runtime.read()).not.toMatch(/\[(?:c1\/promo|c1\/r2\/(?:qty|remove)) /);
    for (const action of [promo, remove, { address: "c1/r2/qty", action: "increment" }])
      expect(runtime.act(action)).toMatchObject({ ok: false, code: "not_actionable" });
  });
});

describe("Cart read and act", () => {
  it("reads projected quantities, prices and totals after adjusting one row or typing a promo code", () => {
    const runtime = createScreenController({ screen, defs: components });
    const plus = { address: "c1/r1/qty", action: "increment" };
    expect(planAct(screen, components, {}, [plus])).toMatchObject({ ok: true });
    expect(runtime.read()).toContain("Total · $37.00");
    expect(runtime.act(plus)).toMatchObject({ ok: true });
    expect(runtime.snapshotScreen().components[0]?.lines).toMatchObject([{ qty: 3 }, { qty: 1 }]);
    expect(runtime.read()).toContain("Total · $49.00");
    expect(runtime.read()).toContain("Qty 3");
    expect(runtime.act(promo)).toMatchObject({ ok: true });
    expect(runtime.read()).toContain("GROW10");
    expect(runtime.read()).toContain("Total · $49.00");
    expect(runtime.act({ ...plus, action: "decrement" })).toMatchObject({ ok: true });
    expect(runtime.read()).toContain("Total · $37.00");
  });

  it("rejects out-of-range directions and synthetic set", () => {
    const lines = [99, 1].map((qty) => ({ ...line, qty }));
    const bounds = { ...screen, components: [{ ...cart, lines }] };
    const runtime = createScreenController({ screen: bounds, defs: components });
    expect(runtime.actionsAt("c1/r1/qty")).toEqual(["decrement"]);
    expect(runtime.actionsAt("c1/r2/qty")).toEqual(["increment"]);
    for (const action of [
      { address: "c1/r1/qty", action: "increment" },
      { address: "c1/r2/qty", action: "decrement" },
      { address: "c1/r2/qty", action: "set", value: 2 },
    ])
      expect(runtime.act(action)).toMatchObject({ ok: false, code: "not_actionable" });
  });

  it("dispatches removal only after confirmation, without navigating", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    expect(runtime.act(remove)).toMatchObject({ ok: true });
    expect(runtime.read()).toContain("[confirm/confirm press]");
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.act({ address: "confirm/cancel", action: "dismiss" })).toMatchObject({ ok: true });
    expect(onAction).not.toHaveBeenCalled();
    expect(runtime.act(remove)).toMatchObject({ ok: true });
    expect(runtime.act({ address: "confirm/confirm", action: "press" })).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith(remove);
    expect(onLink).not.toHaveBeenCalled();
  });
});
