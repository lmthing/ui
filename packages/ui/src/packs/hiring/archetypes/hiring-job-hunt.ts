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
        "Show exactly one selected application . Finish with Offer only if terms exist; otherwise use a Note about the next action. History uses time and title, not end or goto.",
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Applications"], required: true },
        { allow: ["Timeline"], required: true, variant: "history" },
        { allow: ["Offer", "Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "a1", c: "Applications" },
        { id: "t1", c: "Timeline", style: "history" },
        { id: "n1", c: "Note" },
      ],
    },
    hiring_resume: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["ResumeProfile"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "r1", c: "ResumeProfile" },
        { id: "b1", c: "Button" },
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
  {
    kind: "compose",
    archetype: "hiring_job_hunt",
    layout: "hiring_resume",
    brief:
      "Head the screen My résumé. Show Sam Patel, open to work, headline Dog walker. Sam started at Trot in 2025 and has an Animal Care Certificate from North College in 2023. Include Pet first aid and Group handling, the Sam Patel CV attachment, and a Done button back to the tracker.",
  },
] satisfies ComposeProbe[];
