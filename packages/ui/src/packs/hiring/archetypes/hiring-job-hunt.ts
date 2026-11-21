import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const hiring_job_hunt = {
  id: "hiring_job_hunt",
  job: "My applications and follow-ups",
  defaultLayout: "hiring_tracker",
  layouts: {
    hiring_tracker: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Applications"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "a1", c: "Applications" },
        { id: "b1", c: "Button" },
      ],
    },
    hiring_application: {
      writeHints: [
        'Show exactly one selected application with surface "card". Finish with Offer only if terms exist; otherwise use a Note about the next action. History uses time and title, not end or goto.',
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Applications"], required: true },
        { allow: ["Timeline"], required: true, variant: "history" },
        { allow: ["Offer", "Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "a1", c: "Applications", surface: "card" },
        { id: "t1", c: "Timeline", style: "history" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "hiring_job_hunt",
    layout: "hiring_tracker",
    brief:
      "Head the screen My applications. Add employer search and filter chips All and Active. I applied to Trot for Summer dog walker on 2027-04-06, in interview, last contact 2027-04-12, and owe a thank-you on 2027-04-13. I saved Assistant trainer at Coast Dogs without applying. Link both records and finish with Add application.",
  },
  {
    kind: "compose",
    archetype: "hiring_job_hunt",
    layout: "hiring_application",
    brief:
      "Use a back header titled Summer dog walker. Show only my Trot application in a card, applied 2027-04-06, active at interview, last contact 2027-04-12. Show past contact as a history timeline: Apr 6 Applied; Apr 12 Met Jo. I have no offer yet. End with a note: Send a thank-you on Apr 13.",
  },
] satisfies ComposeProbe[];
