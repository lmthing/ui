import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const hiring_openings = {
  id: "hiring_openings",
  job: "Open roles and one role's terms",
  defaultLayout: "hiring_roles",
  layouts: {
    hiring_roles: {
      writeHints: [
        "Use short List rows for the openings and a badge trail with a value on each row for the status.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["List"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "l1", c: "List", trail: "badge" },
        { id: "b1", c: "Button" },
      ],
    },
    hiring_post: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["JobPost"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "j1", c: "JobPost" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "hiring_openings",
    layout: "hiring_roles",
    brief:
      "Head the screen Open roles. Add search for roles and filter chips All and Summer. List Summer dog walker with an Open badge and Weekend walker with a Draft badge; link both openings. Finish with a New role button.",
  },
  {
    kind: "compose",
    archetype: "hiring_openings",
    layout: "hiring_post",
    brief:
      "Use a back header titled Role details. Show Trot's Summer dog walker opening, on-site and fixed-term, paying 18–22 per hour and closing 2027-04-30. Lead group walks; group handling is required. Not saved; link to the application form. Add a note: Tell us which mornings suit you.",
  },
] satisfies ComposeProbe[];
