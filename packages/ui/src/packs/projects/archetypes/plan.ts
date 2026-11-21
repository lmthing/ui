import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const plan = {
  id: "plan",
  job: "Review delivery gates and schedule work across dates",
  defaultLayout: "projects_gates",
  layouts: {
    projects_gates: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Milestones"], required: true, variant: "cards" },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "m1", c: "Milestones", style: "cards" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
    projects_ranges: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Gantt"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "g1", c: "Gantt" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "plan",
    layout: "projects_gates",
    brief:
      "Heading Delivery gates. For folio show Plan sign-off due 2026-11-18 requiring sitemap, and Send files due 2026-11-27 requiring handoff. List requirements below each gate date. Add a note explaining gates depend on accepted work and a See schedule button to projects_ranges.",
  },
  {
    kind: "compose",
    archetype: "plan",
    layout: "projects_ranges",
    brief:
      "Heading Website schedule. For folio draw overlapping task bars from 2026-11-16 to 2026-11-29: Design pages (pages) Nov 19–24, Prepare images (images) Nov 20–24, Pack handoff (handoff) Nov 25–27 after both. Mark Send files on Nov 27. Add a note that bars open tasks and a See gates button to projects_gates.",
  },
] satisfies ComposeProbe[];
