import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  checkScreen,
  components,
  createRegistry,
  packExamples,
  packOf,
  readComponent,
  type ScreenLike,
} from "@lmthing/ui/catalog";

function linksOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(linksOf);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    key === "goto" && typeof child === "string" ? [child] : linksOf(child),
  );
}

it("validates the worked Crumb screens and their destinations", () => {
  const draft = createRegistry({ packs: ["commerce"], includeDrafts: true });
  const commerceIds = Object.entries(packOf)
    .filter(([, pack]) => pack === "commerce")
    .map(([id]) => id);
  expect(packExamples.commerce).toBe(readFileSync(new URL("../example.jsonl", import.meta.url), "utf8"));
  const screens: ScreenLike[] = [];
  const lines = packExamples.commerce.trim().split("\n");
  for (const line of lines) {
    const entry: ScreenLike["components"][number] = JSON.parse(line);
    if (entry.c === "Header") screens.push({ id: entry.id.replace(/_header$/, ""), components: [] });
    screens.at(-1)!.components.push(entry);
  }
  expect(screens.map(({ id }) => id)).toEqual([
    "shop",
    "loaf",
    "pastry",
    "basket",
    "checkout",
    "status",
    "orders",
    "ready_order",
    "order",
    "apron",
    "saved",
    "scan_barcode",
  ]);
  const used = new Set(screens.flatMap((screen) => screen.components.map(({ c }) => c)));
  for (const id of commerceIds) expect(used.has(id)).toBe(true);
  for (const screen of screens) expect(checkScreen(screen, draft)).toEqual([]);
  for (const screen of screens)
    for (const goto of linksOf(screen.components)) expect(screens.some(({ id }) => id === goto)).toBe(true);
  const scan = screens.find(({ id }) => id === "scan_barcode");
  expect(scan?.components).toContainEqual(expect.objectContaining({ c: "Camera", kind: "scan" }));

  const orders = screens.find(({ id }) => id === "orders")!;
  const rows = components.List.props.parse({
    rows: orders.components.find(({ c }) => c === "List")!.rows,
  }).rows;
  for (const { title, goto } of rows) {
    const receipt = screens.find(({ id }) => id === goto)?.components.find(({ c }) => c === "OrderSummary");
    expect(receipt?.number).toBe(title);
  }
});

it("reads unit-price totals rounded to cents for basket and receipt", () => {
  const lines = [{ name: "Item one", qty: 3, price: 0.1 }];
  const cart = { lines: [{ ...lines[0]!, photo: "local:1" }], delivery: 0.1 };
  const receipt = { number: "1", date: "2026-11-20", lines, mode: "pickup" };
  expect(readComponent(components.Cart, cart, "c1")[0]).toMatch(/Total 0\.4\b/);
  expect(readComponent(components.OrderSummary, receipt, "o1")[0]).toMatch(/Total 0\.3\b/);
  expect(readComponent(components.Cart, cart, "c1")[0]).toContain("$0.10");
  expect(readComponent(components.Cart, cart, "c1")[0]).toContain("Subtotal · $0.30");
  expect(readComponent(components.Cart, cart, "c1")[0]).toContain("delivery · $0.10");
  expect(readComponent(components.OrderSummary, receipt, "o1")[0]).toContain("$0.10");
  expect(readComponent(components.OrderSummary, receipt, "o1")[0]).toContain("20 Nov 2026");
  expect(components.Cart.props.safeParse({ ...cart, delivery: 10.075 }).success).toBe(false);
  expect(
    components.OrderSummary.props.safeParse({
      ...receipt,
      lines: [{ ...lines[0]!, price: 10.075 }],
    }).success,
  ).toBe(false);
});

it("reads sale prices, stock, and named option surcharges", () => {
  const { Product, ProductGrid, VariantPicker } = components;
  const reading = readComponent(Product, Product.examples[0], "p1").join("\n");
  expect(reading).toContain("$16 → $12");
  expect(reading).toContain("stock · 3");
  expect(readComponent(Product, { ...Product.examples[0], stock: 0 }, "p1")[0]).toContain("stock · 0");
  const tiles = readComponent(ProductGrid, ProductGrid.examples[0], "p1").join("\n");
  expect(tiles).toContain("Fern pot · $16 → $12");
  expect(tiles).toContain("Basil planter · $10");
  const choices = readComponent(VariantPicker, VariantPicker.examples[0], "v1").join("\n");
  expect(choices).toContain("Clay · +$2");
});

it("reads the supplied fulfillment times and offer expiry", () => {
  const { OrderStatus, Promo } = components;
  expect(readComponent(OrderStatus, OrderStatus.examples[0], "o1")[0]).toContain("Preparing · 09:00");
  expect(readComponent(Promo, Promo.examples[0], "p1")[0]).toContain("ends · 30 Nov 2026");
});
