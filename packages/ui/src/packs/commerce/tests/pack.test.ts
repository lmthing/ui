import { expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkPacks,
  checkScreen,
  components,
  createRegistry,
  packArchetypes,
  packExamples,
  packOf,
  packReady,
  packs,
  readComponent,
  writerFormat,
  type ArchetypeMeta,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";
import * as commerce from "..";

const ids = [
  "Product",
  "ProductGrid",
  "VariantPicker",
  "Cart",
  "CartBar",
  "Checkout",
  "OrderSummary",
  "OrderStatus",
  "Promo",
] as const;
const core = createRegistry();
const draft = createRegistry({ packs: ["commerce"], includeDrafts: true });
const empty: CastLike = { things: [], items: [] };
const casts: CastLike[] = [
  empty,
  {
    things: [{ type: "product", fields: ["label", "detail"] }],
    items: [{ id: "item", type: "product", sample: true, label: "Fern pot", detail: "A glazed pot" }],
  },
  { things: [], items: [{ id: "bad", type: "product", sample: true, name: 99, detail: "   " }] },
];
const cases = [
  [commerce.shop, commerce.shopProbes, ["grid", "menu"]],
  [commerce.product, commerce.productProbes, ["simple", "variants"]],
  [commerce.cart, commerce.cartProbes, ["simple"]],
  [commerce.checkout, commerce.checkoutProbes, ["pay", "status"]],
  [commerce.orders, commerce.ordersProbes, ["today", "order"]],
  [commerce.product_edit, commerce.productEditProbes, ["form"]],
] as const;

it("generates commerce entries without leaking them into the default registry", () => {
  const live = createRegistry({ packs: ["commerce"] });
  const ready = packReady("commerce");
  expect(
    Object.entries(packOf)
      .filter(([, pack]) => pack === "commerce")
      .map(([id]) => id)
      .sort(),
  ).toEqual([...ids].sort());
  expect(packArchetypes.commerce.map(({ id }) => id).sort()).toEqual(cases.map(([meta]) => meta.id).sort());
  const format = JSON.stringify(writerFormat(draft));
  const liveFormat = JSON.stringify(writerFormat(live));
  for (const id of ids) {
    expect(core.ids).not.toContain(id);
    expect(draft.schema(id)).toBe(components[id].props);
    expect(format).toContain(`"const":"${id}"`);
    expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready);
  }
  if (!ready) expect(live.ids).toEqual(core.ids);
  expect(draft.ids).not.toContain("ServiceMenu");
  expect(format).not.toContain('"const":"ServiceMenu"');
});

it("checks pack metadata, layout ownership and every Crumb line", () => {
  expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
  expect(checkArchetypes({ components, archetypes, packOf, packArchetypes })).toEqual([]);
});

it.each(cases)("completes per-layout defaults from the neutral cast", (meta, probes, layouts) => {
  expect(Object.keys(meta.layouts)).toEqual(layouts);
  expect(probes.map(({ layout }) => layout)).toEqual(layouts);
  for (const probe of probes) expect(probe.archetype).toBe(meta.id);
  for (const layout of layouts) {
    const recipe = (meta as ArchetypeMeta).layouts[layout]!;
    const screen = draft.defaultLines(meta.id, layout, empty);
    expect(checkScreen(screen, draft)).toEqual([]);
    expect(screen.components.map(({ c }) => c)).toEqual(recipe.defaults.map(({ c }) => c));
    const seeded = screen.components.map((line, i) => ({ ...line, ...recipe.defaults[i] }));
    expect(checkScreen({ ...screen, components: seeded }, draft)).toEqual([]);
  }
  expect(core.archetypes).not.toHaveProperty(meta.id);
  expect(Object.hasOwn(createRegistry({ packs: ["commerce"] }).archetypes, meta.id)).toBe(
    packReady("commerce"),
  );
});

it.each(ids)("validates %s examples, fallbacks, metadata and probe shape", (id) => {
  const def: Definition = components[id];
  if (def.meta.status === "draft") expect(commerce[id]).not.toHaveProperty(id);
  expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
  expect(def.meta.realPath).not.toBe("");
  expect(Object.keys(def.meta.variants ?? {})).not.toHaveLength(0);
  for (const part of [...(def.meta.parts ?? []), ...(def.meta.items?.parts ?? [])])
    expect(part).toMatch(/^[a-z][a-z0-9_]*$/);
  expect(def.examples.length).toBeGreaterThanOrEqual(2);
  for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
  for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
  expect(def.props.safeParse({ ...(def.examples[0] as object), color: "#ff0000" }).success).toBe(false);
  expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: id }));
  expect(def.probes).toContainEqual(expect.objectContaining({ kind: "write", expect: id }));
  expect(def.probes).toContainEqual(expect.objectContaining({ kind: "read" }));
  expect(
    def.probes.some((probe) => probe.kind === "choose" && core.ids.some((id) => id === probe.expect)),
  ).toBe(true);
});

it("rejects out-of-bounds values and invented derived fields", () => {
  const { Product, ProductGrid, VariantPicker, Cart, CartBar, Checkout, OrderSummary, OrderStatus, Promo } =
    components;
  const invalid = {
    Product: [
      { ...Product.examples[0], name: "a".repeat(33) },
      { ...Product.examples[0], stock: -1 },
    ],
    ProductGrid: [
      { items: [] },
      { items: Array(9).fill(ProductGrid.examples[0]!.items[0]) },
      { ...ProductGrid.examples[1], arrange: "grid" },
    ],
    VariantPicker: [
      { ...VariantPicker.examples[0], at: 2 },
      { ...VariantPicker.examples[0], at: 5 },
      { ...VariantPicker.examples[0], style: "named" },
    ],
    Cart: [{ lines: [{ ...Cart.examples[0]!.lines[0], qty: 100 }] }, { ...Cart.examples[0], total: 37 }],
    CartBar: [{ ...CartBar.examples[0], count: 3 }, { goto: "bad id" }],
    Checkout: [
      { ...Checkout.examples[0], modes: ["pickup"] },
      { ...Checkout.examples[0], methods: ["card", "card"] },
      { ...Checkout.examples[0], total: 12 },
    ],
    OrderSummary: [
      { ...OrderSummary.examples[0], date: "2026-02-30" },
      { ...OrderSummary.examples[0], lines: [] },
    ],
    OrderStatus: [
      { ...OrderStatus.examples[0], at: 3 },
      { ...OrderStatus.examples[0], steps: [{ label: "Ready", time: "25:00" }] },
    ],
    Promo: [
      { ...Promo.examples[0], code: "a".repeat(13) },
      { ...Promo.examples[0], photo: "https://example.org/promo.png" },
    ],
  };
  for (const [id, values] of Object.entries(invalid))
    for (const value of values)
      expect(components[id as keyof typeof invalid].props.safeParse(value).success).toBe(false);
});

it("offers only available variant, advance and copy actions", () => {
  const { VariantPicker, OrderStatus, Promo } = components;
  const picker = readComponent(VariantPicker, VariantPicker.examples[0], "v1").join("\n");
  expect(picker).toContain("[v1/r2 select]");
  expect(picker).not.toContain("[v1/r3 select]");
  expect(readComponent(OrderStatus, OrderStatus.examples[0], "o1").join("\n")).toContain("[o1/next press]");
  expect(readComponent(OrderStatus, OrderStatus.examples[1], "o1").join("\n")).not.toContain(
    "[o1/next press]",
  );
  expect(readComponent(OrderStatus, { ...OrderStatus.examples[0], at: 2 }, "o1").join("\n")).not.toContain(
    "[o1/next press]",
  );
  expect(readComponent(Promo, Promo.examples[1], "p1").join("\n")).not.toContain("[p1/code");
});
