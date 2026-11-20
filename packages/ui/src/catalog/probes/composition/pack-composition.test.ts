import { expect, it } from "vitest";
import {
  components,
  createRegistry,
  packArchetypes,
  packComposeProbes,
  packComposition,
  defaultLines,
  composePrompt,
  runComposeProbes,
  scoreComposition,
  type ArchetypeMeta,
} from "@lmthing/ui/catalog";

const empty = { things: [], items: [] };

it("completes and validates every booking recipe from neutral cast fallbacks", () => {
  for (const meta of packArchetypes.booking) {
    const adapted = packComposition(meta);
    for (const layout of Object.keys(meta.layouts)) {
      const screen = defaultLines(adapted, layout, empty, components);
      expect(scoreComposition(JSON.stringify(screen), adapted, layout, components).issues).toEqual([]);
    }
  }
});

it.each([
  ["shop", "grid", "ProductGrid", "arrange", "grid", "rows"],
  ["shop", "menu", "ProductGrid", "arrange", "rows", "grid"],
  ["orders", "today", "List", "trail", "badge", "value"],
  ["orders", "order", "OrderStatus", "seller", true, false],
  ["checkout", "status", "OrderStatus", "seller", false, true],
  ["product", "simple", "Scale", "readonly", true, false],
] as const)("preserves and checks %s/%s %s.%s", (id, layout, c, key, value, wrong) => {
  const registry = createRegistry({ packs: ["commerce"], includeDrafts: true });
  const meta = registry.archetypes[id]!.meta;
  const screen = registry.defaultLines(id, layout, empty);
  const entry = screen.components.find((entry) => entry.c === c)!;
  expect(entry[key]).toBe(value);
  expect(scoreComposition(JSON.stringify(screen), meta, layout, components).issues).toEqual([]);
  entry[key] = wrong;
  expect(scoreComposition(JSON.stringify(screen), meta, layout, components).issues).toEqual([
    `Layout requires ${c}.${key} = ${JSON.stringify(value)} (${entry.id})`,
  ]);
});

it("uses the effective prop when a schema supplies its default", () => {
  const registry = createRegistry({ packs: ["commerce"], includeDrafts: true });
  const screen = registry.defaultLines("shop", "grid", empty);
  delete screen.components.find(({ c }) => c === "ProductGrid")!.arrange;
  expect(
    scoreComposition(JSON.stringify(screen), registry.archetypes.shop!.meta, "grid", components).issues,
  ).toEqual([]);
});

it("rejects order rows that override the required badge trail", () => {
  const registry = createRegistry({ packs: ["commerce"], includeDrafts: true });
  const screen = registry.defaultLines("orders", "today", empty);
  const list = screen.components.find(({ c }) => c === "List")!;
  list.rows = [{ title: "Item one", value: "Ready", trail: "none" }];
  const meta = registry.archetypes.orders!.meta;
  expect(scoreComposition(JSON.stringify(screen), meta, "today", components).issues).toEqual([
    `Layout requires List.trail = "badge" (${list.id})`,
  ]);
  list.rows = [{ title: "Item one", value: "Ready" }];
  expect(scoreComposition(JSON.stringify(screen), meta, "today", components).issues).toEqual([]);
});

it("returns an independent copy of nested seed props", () => {
  const rows = [{ title: "Item one" }];
  const meta = packComposition({
    id: "seed",
    job: "Browse entries",
    layouts: {
      list: {
        recipe: [
          { allow: ["Header"], required: true },
          { allow: ["List"], required: true },
          { allow: ["Note"], required: true },
        ],
        defaults: [
          { id: "h1", c: "Header" },
          { id: "l1", c: "List", rows },
          { id: "n1", c: "Note" },
        ],
      },
    },
  });
  const first = defaultLines(meta, "list", empty, components);
  (first.components[1]!.rows as typeof rows)[0]!.title = "Changed";
  expect(rows[0]!.title).toBe("Item one");
  expect(defaultLines(meta, "list", empty, components).components[1]!.rows).toEqual(rows);
});

it("rejects a pack seed that fails the merged component schema", () => {
  const meta: ArchetypeMeta = packArchetypes.commerce.find(({ id }) => id === "shop")!;
  const original = meta.layouts.menu!;
  const menu = {
    ...original,
    defaults: original.defaults.map((line) =>
      line.c === "ProductGrid" ? { ...line, arrange: "unknown" } : line,
    ),
  };
  expect(() =>
    defaultLines(packComposition({ ...meta, layouts: { menu } }), "menu", empty, components),
  ).toThrow();
});

it("sends every authored brief for a layout and keeps the old prompt for layouts without one", async () => {
  const registry = createRegistry({ packs: ["commerce"], includeDrafts: true });
  const shop = registry.archetypes.shop!.meta;
  const authored = packComposeProbes.commerce.find(
    ({ layout, archetype }) => archetype === "shop" && layout === "menu",
  )!;
  const second = { ...authored, brief: "Browse a different menu." };
  const results = await runComposeProbes({
    archetypes: [shop],
    probes: [authored, second],
    defs: components,
    cast: empty,
    samples: 1,
    callModel: async (prompt, _sample, format) => {
      expect(format?.json_schema.strict).toBe(true);
      return JSON.stringify(
        registry.defaultLines("shop", prompt.includes("Layout: shop/menu.") ? "menu" : "grid", empty),
      );
    },
  });
  expect(results.map(({ prompt, status, layout }) => [layout, status, prompt])).toEqual([
    ["grid", "pass", composePrompt(shop, "grid", empty, components)],
    ["menu", "pass", expect.stringContaining(`Brief: ${authored.brief}`)],
    ["menu", "pass", expect.stringContaining(`Brief: ${second.brief}`)],
  ]);
});
