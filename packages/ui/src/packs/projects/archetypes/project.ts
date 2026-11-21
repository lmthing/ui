import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const project = {
  id: "project",
  job: "Review a project's status, delivery gates and agreed scope",
  defaultLayout: "projects_overview",
  layouts: {
    projects_overview: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Card"], required: true },
        { allow: ["KeyValue"], required: true },
        { allow: ["Progress"], required: true },
        { allow: ["Milestones"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "c1", c: "Card" },
        { id: "k1", c: "KeyValue" },
        { id: "p1", c: "Progress" },
        { id: "m1", c: "Milestones" },
        { id: "b1", c: "Button" },
      ],
    },
    projects_scope: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Scope"], required: true, variant: "baseline" },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "s1", c: "Scope", style: "baseline" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "project",
    layout: "projects_overview",
    brief:
      "Back heading Website project; summary card Folio site, badge In progress. Facts: owner Jo, due 2026-11-27. Two of five deliverables accepted. Gate Plan sign-off on 2026-11-18 requires sitemap for project folio. Add a Review scope button linking to projects_scope.",
  },
  {
    kind: "compose",
    archetype: "project",
    layout: "projects_scope",
    brief:
      "Back heading Agreed scope. For folio revision 1, show Sitemap (sitemap), accepted when it links all three pages, and Handoff file (handoff), accepted when it includes editable sources. Show Copywriting under exclusions. A note says Changes need a new revision. Add a Review gates button to projects_gates.",
  },
] satisfies ComposeProbe[];
