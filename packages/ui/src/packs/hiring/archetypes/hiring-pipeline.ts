import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const hiring_pipeline = {
  id: "hiring_pipeline",
  job: "Recruiting for one opening",
  defaultLayout: "hiring_stages",
  layouts: {
    hiring_stages: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["ApplicantPipeline"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Chips" },
        { id: "p1", c: "ApplicantPipeline" },
        { id: "b1", c: "Button" },
      ],
    },
    hiring_interview_day: {
      writeHints: [
        "The hours rail requires a start and later end in HH:MM for each row. Leave meta and done null.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Calendar"], required: true, variant: "week" },
        { allow: ["Timeline"], required: true, variant: "hours" },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Calendar", style: "week" },
        { id: "t1", c: "Timeline", style: "hours" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "hiring_pipeline",
    layout: "hiring_stages",
    brief:
      "Head the screen Summer hiring. Add filter chips All and Active. Show the Summer dog walker opening with Sam Patel (active, screening, applied 2027-04-06) and Riley Chen (withdrawn at interview, applied 2027-04-05); link their application reviews. End with an Add applicant button.",
  },
  {
    kind: "compose",
    archetype: "hiring_pipeline",
    layout: "hiring_interview_day",
    brief:
      "Head the screen Interview day. Show the calendar week of 2027-04-12 and select 2027-04-12. The hours rail shows Sam Patel 09:30–10:00 and Riley Chen 10:15–10:45. Add a note: Meet at the North Park entrance.",
  },
] satisfies ComposeProbe[];
