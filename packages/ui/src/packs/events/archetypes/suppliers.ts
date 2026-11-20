import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const suppliers = {
  id: "suppliers",
  job: "Track suppliers and share the gift list",
  defaultLayout: "vendors",
  layouts: {
    vendors: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Vendors"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "v1", c: "Vendors" },
        { id: "b1", c: "Button" },
      ],
    },
    gifts: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Registry"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "n1", c: "Note" },
        { id: "r1", c: "Registry" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "suppliers",
    layout: "vendors",
    brief:
      "Title the screen Wedding suppliers. Show booked caterer Juniper Kitchen, cost 2400 with 1200 paid and balance due 2027-05-30; music supplier The May Quartet is not booked, cost 900, paid 0. Finish with an Add supplier button.",
  },
  {
    kind: "compose",
    archetype: "suppliers",
    layout: "gifts",
    brief:
      "Title the screen Gifts. Under it put the note 'Celebrating with you is enough.' Then show the shared gift list for guests with unclaimed Linen tablecloth at Loom House for 45, image lib:linen.",
  },
] satisfies ComposeProbe[];
