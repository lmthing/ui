import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const rota = {
  id: "rota",
  job: "The week's shifts and gaps",
  defaultLayout: "week",
  layouts: {
    week: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Roster"], required: true },
        { allow: ["People"], required: true, variant: "stack" },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "r1", c: "Roster" },
        { id: "p1", c: "People", style: "stack" },
      ],
    },
    open: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Banner"], required: true },
        { allow: ["OpenShift"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "b1", c: "Banner" },
        { id: "o1", c: "OpenShift" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "rota",
    layout: "week",
    brief:
      "Show a heading Weekly rota, a two-option switch Week and Open with Week selected, then the staff grid for Monday 2026-11-16. Lee and Rae have lib:people photos. Lee works Monday 07:00–13:00, Rae Wednesday 12:00–17:00. End with Lee and Rae as stacked team avatars.",
  },
  {
    kind: "compose",
    archetype: "rota",
    layout: "open",
    brief:
      "Show the Open shifts heading, a warning banner saying Saturday needs cover, then one unassigned Barista shift with a claim button, on 2026-11-21 from 08:00 to 14:00, pay 96.",
  },
] satisfies ComposeProbe[];
