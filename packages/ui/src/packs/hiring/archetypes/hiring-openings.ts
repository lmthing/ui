import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const hiring_openings = {
  id: "hiring_openings",
  job: "Open roles and one role's terms",
  defaultLayout: "hiring_roles",
  layouts: {
    hiring_roles: {
      writeHints: [
        'Use JobFeed for structured openings with employer, workplace, posting date or pay. For a flat list with only title, status and destination, use List with "style":null and "trail":"badge" at the component level. Put each status in its row value, not in the shelf-only badge field; leave row trail and badge null.',
        'If the results are JobFeed, no chip can bind to it. Use this Chips shape with the requested labels: {"id":"c1","c":"Chips","style":"choose","lead":null,"filter":null,"items":[{"label":"All","on":true,"icon":null,"view":null},{"label":"Summer","on":false,"icon":null,"view":null}]}. Do not generate view objects for these chips.',
        "Write one compact JSON object, with no indentation or extra lines. Include a unique id and c on each component.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["JobFeed", "List"], required: true },
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
