import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const tax_prep = {
  id: "tax_prep",
  job: "Collect evidence for a filing period",
  defaultLayout: "tax_evidence",
  layouts: {
    tax_evidence: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["TaxYear"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "TaxYear" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
    tax_receipts: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Receipts"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "r1", c: "Receipts" },
        { id: "b1", c: "Button" },
      ],
    },
    tax_tasks: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Steps"], required: true },
        { allow: ["Checklist"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Steps" },
        { id: "c1", c: "Checklist" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "tax_prep",
    layout: "tax_evidence",
    brief:
      "Title Evidence for Alex. Filing period 2026-04-06 to 2027-04-05, label Trot 2026–27. Require two receipts labelled Supplies tagged expenses and one document labelled Statements tagged statements. Add a note: Check the folder with your accountant. Add a Review receipts button opening tax_receipts.",
  },
  {
    kind: "compose",
    archetype: "tax_prep",
    layout: "tax_receipts",
    brief:
      "Title Receipt proof and add search by payee. Enter a reviewed Walk Supply receipt, 36 on 2026-11-05, with supplied synthetic file lib:trot_supplies and 75 percent allocated, tag expenses. Add an Add scan button opening vault_capture.",
  },
  {
    kind: "compose",
    archetype: "tax_prep",
    layout: "tax_tasks",
    brief:
      "Title Before handoff. Show step 2 of 3 labelled Check folder. Add two independent ticks, Check the folder (done) and Hand to accountant (not done). Add an Evidence button opening tax_evidence.",
  },
] satisfies ComposeProbe[];
