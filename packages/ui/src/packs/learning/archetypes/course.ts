import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const course = {
  id: "course",
  job: "Find my place in a course and choose what to study next",
  defaultLayout: "path",
  layouts: {
    path: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Streak"], required: true },
        { allow: ["Path"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Streak" },
        { id: "p1", c: "Path" },
        { id: "b1", c: "Button" },
      ],
    },
    list: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Streak"], required: true },
        { allow: ["List"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Streak" },
        { id: "l1", c: "List" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "course",
    layout: "path",
    brief:
      "Show my course as a winding map with completed, current and locked units, study streak and a continue action.",
  },
  {
    kind: "compose",
    archetype: "course",
    layout: "list",
    brief: "Show my course as a plain list of units, with my study streak and a continue action.",
  },
] satisfies ComposeProbe[];
