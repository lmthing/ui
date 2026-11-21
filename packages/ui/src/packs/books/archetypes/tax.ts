import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const tax = {
  id: "tax",
  job: "Review tax provision or preview a VAT period",
  defaultLayout: "books_tax_reserve",
  layouts: {
    books_tax_reserve: {
      writeHints: [
        'Use Amount emphasis "hero". Include Progress only when the host provides a positive target; do not invent a target or supply zero as "of".',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Amount"], required: true },
        { allow: ["Progress"], required: false },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "a1", c: "Amount", emphasis: "hero" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
    books_vat_period: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["VatReturn"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "v1", c: "VatReturn" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "tax",
    layout: "books_tax_reserve",
    brief:
      "Title it Tax reserve. Make Still to reserve 30 USD the large focal amount. Show Reserved 60 of target 90 as a progress bar, a note 'Transfers do not reduce profit.' and a View statement button to statement.",
  },
  {
    kind: "compose",
    archetype: "tax",
    layout: "books_vat_period",
    brief:
      "Title it VAT preview and show the domestic_cash VAT period 2026-10-01 to 2026-12-31, with contributing lines in ledger. Add the note 'Local preview only.' and a View ledger button linking to ledger.",
  },
] satisfies ComposeProbe[];
