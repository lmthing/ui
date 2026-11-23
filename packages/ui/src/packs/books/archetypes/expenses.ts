import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const expenses = {
  id: "expenses",
  job: "Find expense receipts and classify their splits",
  defaultLayout: "books_receipts",
  layouts: {
    books_receipts: {
      writeHints: [
        "Chips.filter can only target a List, not the Expenses register. Keep the requested chip labels, set filter:null and view:null on every chip, and render the receipts in Expenses.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Expenses"], required: true, variant: "register" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "e1", c: "Expenses", style: "register" },
        { id: "b1", c: "Button" },
      ],
    },
    books_receipt_edit: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Expenses"], required: true, variant: "receipt" },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "e1", c: "Expenses", style: "receipt" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

const receipt =
  "Draft travel_1 from Town Transit, 2026-11-20, one split Travel 100 net, businessUse 1, categoryRef travel, vatCode none.";
export const probes = [
  {
    kind: "compose",
    archetype: "expenses",
    layout: "books_receipts",
    brief: `Title it Receipts, then Search receipts and All and Travel filter chips. Show the expense register. ${receipt} End with Add receipt linking to new_receipt.`,
  },
  {
    kind: "compose",
    archetype: "expenses",
    layout: "books_receipt_edit",
    brief: `Use a back heading Edit receipt and the single editable receipt view. ${receipt} Add a note 'Classify before posting.' and a Done button linking to receipts.`,
  },
] satisfies ComposeProbe[];
