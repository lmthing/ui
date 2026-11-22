import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const portfolio_units = {
  id: "portfolio_units",
  job: "Manage rental units and arranged viewings",
  defaultLayout: "property_register",
  layouts: {
    property_register: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Units"], required: true },
        { allow: ["Stats"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "u1", c: "Units" },
        { id: "s2", c: "Stats" },
      ],
    },
    property_viewings: {
      writeHints: [
        'Use Calendar with "style":"week" and mark the viewing day. This is a single week for browsing viewings, not a check-in/check-out picker: leave range, yearMonth, checkIn, checkOut and unavailable null.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Calendar"], required: true, variant: "week" },
        { allow: ["Viewings"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Calendar", style: "week" },
        { id: "v1", c: "Viewings" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "portfolio_units",
    layout: "property_register",
    brief:
      "Show a Three Flats heading, a Search units box, filter chips All and Vacant, the occupancy register on 2026-11-18 (Willow Flat, ref flat_a, tenancy willow_let since 2026-10-01 by Asha at 900 monthly), and the supplied occupancy summary: Occupied 1, Vacant 0.",
  },
  {
    kind: "compose",
    archetype: "portfolio_units",
    layout: "property_viewings",
    brief:
      "Show a Viewings heading, one week of the November 2026 calendar with day 21 marked, and the confirmed Cedar Flat (flat_b) viewing cedar_view for Noor starting 2026-11-21T10:30:00+01:00 for 20 minutes, edit goto edit_viewing. Finish with an Add viewing button.",
  },
] satisfies ComposeProbe[];
