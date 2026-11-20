import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const inspection = {
  id: "inspection",
  job: "Record room conditions or read a signed-off report",
  defaultLayout: "property_inspection_rooms",
  layouts: {
    property_inspection_rooms: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Inspections"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "i1", c: "Inspections" },
        { id: "n1", c: "Note" },
      ],
    },
    property_inspection_report: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Inspections"], required: true, variant: "report" },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "i1", c: "Inspections", style: "report" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "inspection",
    layout: "property_inspection_rooms",
    brief:
      "Show a Move-in inspection back heading, an editable room-by-room inspection willow_move_in for Willow Flat (flat_a) on 2026-11-18 with Kitchen (kitchen), a worn Worktop (worktop) and photo local:1, then a note to complete every check.",
  },
  {
    kind: "compose",
    archetype: "inspection",
    layout: "property_inspection_report",
    brief:
      "Show a Condition report back heading, a read-only inspection report willow_move_in for Willow Flat (flat_a) on 2026-11-18, finalised that day at 10:30 UTC. Kitchen (kitchen), worn Worktop (worktop), photo local:1. Include a note that the evidence is locked.",
  },
] satisfies ComposeProbe[];
