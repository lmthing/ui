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
import { addressedElements, elementAt, renderInstance, styleAt } from "../../../../../test/render";
import { pack } from "../..";

const def = components.ProductGrid;
const { props, meta, examples, fallback, probes } = def;
const grid = examples[0]!;
const menu = examples[1]!;
const item = grid.items[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const screen = { id: "home", components: [{ id: "p1", c: "ProductGrid", ...grid }] };

describe("ProductGrid schema boundaries", () => {
  it.each(examples)("accepts every domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("defaults to a two-column layout and accepts the exact field and item limits", () => {
    expect(props.parse({ items: [{ ...item, name: " Fern pot " }] })).toMatchObject({
      arrange: "grid",
      items: [{ name: "Fern pot" }],
    });
    const max = {
      ...item,
      name: "a".repeat(28),
      badge: "b".repeat(12),
      sub: "c".repeat(48),
      goto: "d".repeat(64),
    };
    expect(props.safeParse({ items: Array.from({ length: 8 }, () => max), arrange: "rows" }).success).toBe(
      true,
    );
    expectTypeOf<Props<typeof props, typeof meta>["items"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { items: [] },
    { items: Array.from({ length: 9 }, () => item) },
    { ...grid, arrange: "strip" },
    { ...grid, density: "spacious" },
    { ...grid, color: "red" },
    ...[
      { name: " " },
      { name: "a".repeat(29) },
      { price: -1 },
      { price: 1.001 },
      { price: Infinity },
      { price: "$12" },
      { was: -2 },
      { was: 1.001 },
      { photo: "https://example.org/image.png" },
      { photo: undefined },
      { badge: "b".repeat(13) },
      { goto: "Bad ID" },
      { goto: undefined },
      { sub: "Menu only" },
      { id: "r1" },
      { pixels: 4 },
    ].map((patch) => ({ items: [{ ...item, ...patch }] })),
    { arrange: "rows", items: [{ ...item, sub: "c".repeat(49) }] },
  ])("rejects invalid wire data", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("ProductGrid metadata and probes", () => {
  it("keeps the pack readiness gate and both choose targets", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", dense: true, weight: 3 });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "ProductGrid",
      "Gallery",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "write",
        expect: "ProductGrid",
        variant: { axis: "arrange", value: "rows" },
      }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "read",
        expect: { address: "p1/r2/add", action: "press" },
      }),
    );
  });
});

describe("ProductGrid fallback", () => {
  it("uses up to three bounded titles of the declared cast kind", () => {
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["label"] }],
      items: Array.from({ length: 4 }, (_, n) => ({
        id: `plant_${n}`,
        type: "plant",
        sample: true,
        label: n ? "x".repeat(80) : "Fern",
      })),
    };
    const input = fallback({ cast });
    expect(input.items).toHaveLength(3);
    expect(input.items[0]).toMatchObject({ name: "Fern", price: 0 });
    expect(props.safeParse(input).success).toBe(true);
  });

  it.each([[], [{ id: "item", type: "plant", sample: true, name: 4 }]])(
    "uses a neutral item when the cast has no usable text",
    (...items) => {
      const input = fallback({ cast: { things: [], items } });
      expect(props.safeParse(input).success).toBe(true);
      expect(input.items).toEqual([{ name: "Item one", price: 0, photo: "local:1", goto: "detail" }]);
    },
  );
});

describe("ProductGrid states and parts", () => {
  it.each([grid, menu])("renders a detail link and a separate, named quick-add button", (input) => {
    const html = renderInstance("ProductGrid", input, "filled", theme);
    const prefix = "home/c1/r1/";
    const link = elementAt(html, `${prefix}root`);
    expect(link.attributes).toContain('role="link"');
    const button = elementAt(html, `${prefix}add`);
    expect(button.attributes).toContain('role="button"');
    expect(button.attributes).toContain(`aria-label="Add ${input.items[0]!.name} to basket"`);
    expect(JSON.stringify(link.children)).not.toContain(`${prefix}add`);
    const addresses = addressedElements(html);
    for (const part of ["name", "photo", "price", "add_icon"])
      expect(addresses.has(prefix + part)).toBe(true);
    expect(addresses.has(`${prefix}badge`)).toBe(input === grid);
    expect(addresses.has(`${prefix}was`)).toBe(input === grid);
    expect(addresses.has(`${prefix}sub`)).toBe(input === menu);
    if (input === grid) expect(styleAt(html, `${prefix}was`)).toContain("line-through");
  });

  it.each(["empty", "loading"] as const)("draws %s with no actionable items", (state) => {
    for (const input of [grid, menu]) {
      const html = renderInstance("ProductGrid", input, state, theme, "plant");
      expect(elementAt(html, "home/c1/root")).toBeDefined();
      expect(html).toContain(state === "empty" ? emptyLine("plant") : loadingLabel);
      expect(html).not.toContain("home/c1/r1/");
      const runtime = createScreenController({
        screen: { ...screen, components: [{ ...screen.components[0]!, state }] },
        defs: components,
      });
      for (const address of ["p1/r1/root", "p1/r1/add"])
        expect(runtime.act({ address, action: "press" })).toMatchObject({
          ok: false,
          code: "not_actionable",
        });
    }
  });
});

describe("ProductGrid read and act", () => {
  it("reads current and old prices with distinct root and add addresses", () => {
    const read = readComponent(def, grid, "p1").join("\n");
    expect(read).toContain("Fern pot · $16 → $12");
    expect(read).toContain("Basil planter · $10");
    expect(read).toContain("[p1/r1 press→fern_pot]");
    expect(read).toContain("[p1/r1/add press]");
    expect(planAct(screen, components, {}, [{ address: "p1/r1/price", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });

  it("sends quick add to the host without navigating, and the detail link navigates", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    expect(runtime.act({ address: "home/p1/r2/add", action: "press" })).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/p1/r2/add", action: "press" });
    expect(onLink).not.toHaveBeenCalled();
    expect(runtime.act({ address: "home/p1/r2/root", action: "press" })).toMatchObject({ ok: true });
    expect(onLink.mock.calls[0]?.[0]).toBe("basil_planter");
  });
});
