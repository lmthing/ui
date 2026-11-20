import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const books_home = {
  id: "books_home",
  job: "Review business cash and recent entries",
  defaultLayout: "books_overview",
  layouts: {
    books_overview: {
      writeHints: ['Display the main cash figure with Amount emphasis "hero", not a style.'],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Amount"], required: true, variant: "hero" },
        { allow: ["Actions"], required: true },
        { allow: ["Ledger"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "a1", c: "Amount", emphasis: "hero" },
        { id: "a2", c: "Actions" },
        { id: "l1", c: "Ledger" },
      ],
    },
    books_ledger: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Ledger"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "l1", c: "Ledger" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

const cash =
  "Ledger period 2026-11-01 to 2026-11-30. On 2026-11-12, enter walk_pay, Park walks, 100 net in, account cash, category walks, no VAT.";
export const probes = [
  {
    kind: "compose",
    archetype: "books_home",
    layout: "books_overview",
    brief: `Title it Trot cash, with a large focal Cash amount of 100 USD and separate Receipts and Reports shortcuts to receipts and reports. ${cash}`,
  },
  {
    kind: "compose",
    archetype: "books_home",
    layout: "books_ledger",
    brief: `Title it Cash ledger, then Search entries and filter chips All and Walks. ${cash} Finish with Add entry linking to add_entry.`,
  },
] satisfies ComposeProbe[];
