import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const report = {
  id: "report",
  job: "Understand how an operation is doing",
  defaultLayout: "charts",
  layouts: {
    charts: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Stats"], required: true },
        { allow: ["LineChart"], required: true },
        { allow: ["Bars"], required: true, variant: "share" },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "s2", c: "Stats" },
        { id: "l1", c: "LineChart" },
        { id: "b1", c: "Bars", style: "share" },
      ],
    },
    patterns: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Heatmap"], required: true },
        { allow: ["Bars"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "m1", c: "Heatmap" },
        { id: "b1", c: "Bars" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "report",
    layout: "charts",
    brief:
      "Start with a Sales heading and a Week / Month view switcher. Summarize Orders 45 and Returns 4. Draw Weekly sales as a line with labels W1 through W4 and Orders 6, 9, 12, 18. Finish with a share breakdown of 45 Orders: Tools 20 and Seeds 25.",
  },
  {
    kind: "compose",
    archetype: "report",
    layout: "patterns",
    brief:
      "Show a Traffic heading, then shade daily visits in a four-week matrix titled Visits by day (unit visits). Monday first, the four rows are [1,0,2,0,1,4,3], [3,0,2,0,1,2,5], [1,1,1,0,2,4,3] and [2,0,0,1,2,5,2]. Then compare Mon 7 and Tue 1 as bars titled Early week.",
  },
] satisfies ComposeProbe[];
