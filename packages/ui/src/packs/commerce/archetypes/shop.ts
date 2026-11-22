import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const shop = {
  id: "shop",
  job: "Browse goods for sale",
  defaultLayout: "grid",
  layouts: {
    grid: {
      writeHints: ['Use arrange "grid" on ProductGrid. Omit sub on every item.'],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Promo"], required: true },
        { allow: ["ProductGrid"], required: true },
        { allow: ["CartBar"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "p1", c: "Promo" },
        { id: "p2", c: "ProductGrid", arrange: "grid" },
        { id: "c2", c: "CartBar" },
      ],
    },
    menu: {
      writeHints: ['Use arrange "rows" on ProductGrid for menu rows; sub is optional.'],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Promo"], required: true },
        { allow: ["ProductGrid"], required: true },
        { allow: ["CartBar"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "p1", c: "Promo" },
        { id: "p2", c: "ProductGrid", arrange: "rows" },
        { id: "c2", c: "CartBar" },
      ],
    },
    saved: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["SavedList"], required: true },
        { allow: ["CartBar"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "SavedList" },
        { id: "c1", c: "CartBar" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "shop",
    layout: "grid",
    brief:
      "Browse a maker's goods with search, category filters, an offer, two-column shopping cards and a basket link.",
  },
  {
    kind: "compose",
    archetype: "shop",
    layout: "menu",
    brief: "Browse bakery pre-orders with search, categories, an offer, food menu rows and a basket link.",
  },
  {
    kind: "compose",
    archetype: "shop",
    layout: "saved",
    brief: "Review products I saved for later, see any price changes, and move products into my basket.",
  },
] satisfies ComposeProbe[];
