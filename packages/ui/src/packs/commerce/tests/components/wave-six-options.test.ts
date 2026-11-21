import { expect, it, vi } from "vitest";
import { components, readComponent, type ThemeChoice } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const { OrderStatus, Product, ProductGrid, Promo, VariantPicker } = components;
type Name = "OrderStatus" | "Product" | "ProductGrid" | "Promo" | "VariantPicker";
const parts = (id: Name, input: unknown, state: "filled" | "success" | "loading" = "filled") =>
  addressedElements(renderInstance(id, input, state, theme));
const address = (part: string) => `home/c1/${part}`;
const read = (id: Name, input: unknown) => readComponent(components[id], input, "x").join("\n");
const screenFor = (c: Name, input: object, state = "filled" as "filled" | "success") => ({
  id: "home",
  components: [{ id: "x", c, ...input, state }],
});

it("exposes carrier checkpoints, proof and a host copy action even after delivery", () => {
  const carrier = OrderStatus.examples.find((example) => example.style === "carrier")!;
  const drawn = parts("OrderStatus", carrier, "success");
  for (const part of ["carrier", "tracking", "proof", "r2/time"]) expect(drawn.has(address(part))).toBe(true);
  expect(read("OrderStatus", carrier)).toContain("[x/tracking press]");
  expect(OrderStatus.props.safeParse({ ...carrier, trackingNumber: "X".repeat(25) }).success).toBe(false);
  expect(OrderStatus.props.safeParse({ ...carrier, style: "pickup" }).success).toBe(false);
  const onAction = vi.fn();
  const runtime = createScreenController({
    screen: screenFor("OrderStatus", carrier, "success"),
    defs: components,
    onAction,
  });
  expect(runtime.act({ address: "x/tracking", action: "press" }).ok).toBe(true);
  expect(onAction).toHaveBeenCalledWith({ address: "home/x/tracking", action: "press" });
  runtime.dispose();
});

it("renders a pickup code and lets only the buyer announce arrival while the order is active", () => {
  const pickup = OrderStatus.examples.find((example) => example.style === "pickup")!;
  const html = renderInstance("OrderStatus", pickup, "filled", theme);
  const drawn = addressedElements(html);
  expect(drawn.get(address("bay"))?.text).toEqual(["Locker 12"]);
  expect(drawn.get(address("pickup_code"))?.attributes).toContain("FERN42");
  expect(html).toMatch(/<path d="M\d+ \d+h/);
  expect(read("OrderStatus", pickup)).toContain("[x/here press]");
  for (const [state, seller] of [
    ["filled", false],
    ["filled", true],
    ["success", false],
  ] as const) {
    const input = { ...pickup, seller };
    const onAction = vi.fn();
    const runtime = createScreenController({
      screen: screenFor("OrderStatus", input, state),
      defs: components,
      onAction,
    });
    const show = state === "filled" && !seller;
    expect(parts("OrderStatus", input, state).has(address("here"))).toBe(show);
    expect(runtime.act({ address: "x/here", action: "press" }).ok).toBe(show);
    expect(onAction).toHaveBeenCalledTimes(show ? 1 : 0);
    runtime.dispose();
  }
});

it("shows store stock separately from online stock, and opens the Camera scan screen through the tagged part", () => {
  const store = Product.examples.find((example) => example.scan)!;
  const input = { ...store, stock: 3, storeStock: 0 };
  const drawn = parts("Product", input);
  for (const [part, text] of [
    ["stock", "Only 3 left"],
    ["store_stock", "0 in store"],
    ["aisle", "Aisle B4"],
    ["store_name", "Market Street"],
    ["clean_tag_1", "Peat free"],
    ["clean_tag_2", "Locally made"],
  ]) {
    expect(JSON.stringify(drawn.get(address(part!)))).toContain(text);
    expect(read("Product", input)).toContain(text);
  }
  expect(Product.meta.partTiers.scan).toBe("ok");
  expect(read("Product", input)).toContain("[x/scan press→scan_barcode !needs-ok]");
  const onLink = vi.fn();
  const runtime = createScreenController({ screen: screenFor("Product", input), defs: components, onLink });
  expect(runtime.act({ address: "x/scan", action: "press" }).ok).toBe(true);
  expect(onLink).toHaveBeenCalledWith("scan_barcode", "home/x/scan");
  runtime.dispose();
  expect(parts("Product", input, "loading").has(address("scan"))).toBe(false);
  expect(Product.props.safeParse({ ...input, storeStock: 0.5 }).success).toBe(false);
  expect(Product.props.safeParse({ ...input, aisle: "X".repeat(17) }).success).toBe(false);
  expect(Product.props.safeParse({ ...input, storeName: "X".repeat(25) }).success).toBe(false);
});

it("shows a deal countdown, calculated discount and each claim percentage with unchanged item addresses", () => {
  const deal = ProductGrid.examples.find((example) => example.style === "deals")!;
  const input = { ...deal, items: deal.items.map((item, index) => ({ ...item, claimed: index * 100 })) };
  const drawn = parts("ProductGrid", input);
  expect(drawn.get(address("r1/badge"))?.text).toEqual(["-25%"]);
  expect(drawn.has(address("countdown"))).toBe(true);
  for (const [n, value] of [
    [1, "0%"],
    [2, "100%"],
  ] as const) {
    expect(drawn.get(address(`r${n}/claim_value`))?.text).toEqual([value]);
    expect(drawn.get(address(`r${n}/root`))?.attributes).toContain('role="link"');
    expect(drawn.get(address(`r${n}/add`))?.attributes).toContain('role="button"');
    expect(read("ProductGrid", input)).toContain(`Claimed · ${value}`);
  }
  const loading = parts("ProductGrid", input, "loading");
  expect(loading.has(address("deals_header"))).toBe(true);
  for (const part of ["r1/root", "r1/add", "r1/claimed", "countdown"])
    expect(loading.has(address(part))).toBe(false);
  for (const claimed of [-1, 101, 2.5])
    expect(ProductGrid.props.safeParse({ ...deal, items: [{ ...deal.items[0], claimed }] }).success).toBe(
      false,
    );
});

it("keeps the same shade addresses and selection indexes after grouping by depth and undertone", () => {
  const shade = VariantPicker.examples.find((example) => example.style === "shade")!;
  const drawn = parts("VariantPicker", shade);
  expect(drawn.get(address("r3/depth"))?.text).toEqual(["Light"]);
  expect(drawn.get(address("r1/depth"))?.text).toEqual(["Medium"]);
  expect(drawn.get(address("r3/undertone"))?.text).toEqual(["Cool"]);
  expect(drawn.get(address("r2/root"))?.attributes).toContain('aria-checked="true"');
  expect([...drawn.keys()].filter((id) => /r\d\/root$/.test(id))).toEqual(
    ["r3", "r2", "r1"].map((id) => address(`${id}/root`)),
  );
  const runtime = createScreenController({ screen: screenFor("VariantPicker", shade), defs: components });
  expect(runtime.act({ address: "x/r3", action: "select" }).ok).toBe(false);
  expect(runtime.act({ address: "x/r1", action: "select" }).ok).toBe(true);
  expect(runtime.snapshotScreen().components[0]?.at).toBe(0);
  runtime.dispose();
  expect(
    VariantPicker.props.safeParse({
      ...shade,
      options: [{ ...shade.options[0], depth: undefined }, ...shade.options.slice(1)],
    }).success,
  ).toBe(false);
});

it("renders an optional Promo closing time without requiring a countdown", () => {
  const input = { ...Promo.examples[1]!, endsAt: "18:30" };
  const drawn = parts("Promo", input);
  expect(drawn.get(address("ends"))?.text).toEqual(["ends · 18:30"]);
  expect(drawn.has(address("countdown"))).toBe(false);
  expect(read("Promo", input)).toContain("ends · 18:30");
  expect(Promo.props.safeParse({ ...input, endsAt: "24:01" }).success).toBe(false);
  expect(Promo.props.safeParse({ ...input, style: "countdown" }).success).toBe(false);
});

it.each(["Promo", "ProductGrid"] as const)(
  "projects the %s countdown against the host clock and expires at zero",
  (id) => {
    const def = components[id];
    const ends = "2029-11-30",
      endsAt = "18:30";
    const input =
      id === "Promo"
        ? { title: "Flash sale", goto: "deal", style: "countdown", ends, endsAt }
        : { ...ProductGrid.examples[0], style: "deals", ends, endsAt };
    const deadline = Date.parse(`${ends}T${endsAt}`);
    let now = deadline - 2 * 60_000;
    const runtime = createScreenController({
      screen: screenFor(id, input),
      defs: components,
      now: () => now,
    });
    try {
      runtime.mount();
      runtime.tick();
      expect(runtime.liveControls(def.meta, def.props.parse(input), "x").remainingMs).toBe(120_000);
      now = deadline;
      runtime.tick();
      const projected = runtime.liveControls(def.meta, def.props.parse(input), "x");
      expect(projected.remainingMs).toBe(0);
      expect(def.meta.read(projected, "filled", "en")).toContain("Offer ended");
    } finally {
      runtime.dispose();
    }
  },
);
