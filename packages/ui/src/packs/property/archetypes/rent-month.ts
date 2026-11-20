import { placeholderTitle, type ArchetypeMeta, type ComposeProbe } from "../../../catalog";

export const rent_month = {
  id: "rent_month",
  job: "Reconcile monthly rent and record a receipt",
  defaultLayout: "property_rent_ledger",
  layouts: {
    property_rent_ledger: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["RentRoll"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "r1", c: "RentRoll" },
        { id: "n1", c: "Note" },
      ],
    },
    property_rent_receipt: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Field"], required: true, variant: "number" },
        { allow: ["Field"], required: true, variant: "date" },
        { allow: ["Field"], required: true, variant: "choice" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "f1", c: "Field", kind: "number" },
        { id: "f2", c: "Field", kind: "date" },
        { id: "f3", c: "Field", kind: "choice", options: [placeholderTitle(0), placeholderTitle(1)] },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "rent_month",
    layout: "property_rent_ledger",
    brief:
      "Build a November rent heading, a ledger for 2026-11 with charge nov_willow of 900 due 2026-11-01 for Asha (asha_let) in Willow Flat (flat_a) and a 600 transfer receipt willow_part dated 2026-11-05 allocated to it, and a note that recording a receipt does not move money.",
  },
  {
    kind: "compose",
    archetype: "rent_month",
    layout: "property_rent_receipt",
    brief:
      "Use a Record receipt heading with back navigation, a numeric Amount field, a Receipt date field, a Payment method choice field with Cash, Transfer and Card, then a Save receipt button.",
  },
] satisfies ComposeProbe[];
