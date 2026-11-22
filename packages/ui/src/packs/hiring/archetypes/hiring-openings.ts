import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const hiring_openings = {
  id: "hiring_openings",
  job: "Open roles and one role's terms",
  defaultLayout: "hiring_roles",
  layouts: {
    hiring_roles: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["JobFeed"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "f1", c: "JobFeed" },
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
      "Head the screen Open roles. Add role search and filter chips All and Summer. List Trot’s open Summer dog walker role, on-site in North Park, posted 2026-11-20, paying 18 to 22 per hour with easy apply, and Coast Dogs’ open hybrid Assistant trainer role, posted 2026-11-17 without easy apply. Neither is saved. Link both details and finish with a Saved openings button.",
  },
  {
    kind: "compose",
    archetype: "hiring_openings",
    layout: "hiring_post",
    brief:
      "Use a back header titled Role details. Show Trot's Summer dog walker opening, on-site and fixed-term, paying 18–22 per hour and closing 2027-04-30. Lead group walks; group handling is required. Not saved; link to the application form. Add a note: Tell us which mornings suit you.",
  },
] satisfies ComposeProbe[];
