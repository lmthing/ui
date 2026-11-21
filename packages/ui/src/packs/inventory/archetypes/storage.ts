import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const storage = {
  id: "storage",
  job: "Where things are",
  defaultLayout: "browse",
  layouts: {
    browse: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Storage"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "s2", c: "Storage" },
      ],
    },
    loans: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Loans"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "l1", c: "Loans" },
      ],
    },
    wants: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Wishlist"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Chips" },
        { id: "w1", c: "Wishlist" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "storage",
    layout: "browse",
    brief:
      "Heading Garage boxes and a search field above the nested storage browser. Breadcrumb Garage, then Shelf 2. Child spot Tool crate with square icon opening tools. Spare screws are stored on the shelf itself.",
  },
  {
    kind: "compose",
    archetype: "storage",
    layout: "loans",
    brief:
      "Heading On loan, then a Lent/Borrowed segmented control with Lent selected. Show my drill lent to Noor on 2026-11-01, due back 2026-11-30, with actions for return and reminder.",
  },
  {
    kind: "compose",
    archetype: "storage",
    layout: "wants",
    brief:
      "Heading Things to get, followed by All and Lighting filter chips, my wish for a floor lamp priced at 60 with a target of 45 and priority 1, and an Add wish button.",
  },
] satisfies ComposeProbe[];
