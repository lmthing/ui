import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const hiring_candidate = {
  id: "hiring_candidate",
  job: "Review, meet and make an offer",
  defaultLayout: "hiring_review",
  layouts: {
    hiring_review: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Candidate"], required: true },
        { allow: ["KeyValue"], required: true },
        { allow: ["Checklist"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "c1", c: "Candidate" },
        { id: "k1", c: "KeyValue" },
        { id: "c2", c: "Checklist" },
        { id: "b1", c: "Button" },
      ],
    },
    hiring_meeting: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Interview"], required: true },
        { allow: ["KeyValue"], required: true },
        { allow: ["Composer"], required: true, variant: "entry" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "i1", c: "Interview" },
        { id: "k1", c: "KeyValue" },
        { id: "c1", c: "Composer", style: "entry" },
        { id: "b1", c: "Button" },
      ],
    },
    hiring_terms: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Offer"], required: true },
        { allow: ["Amount"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "o1", c: "Offer" },
        { id: "a1", c: "Amount" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "hiring_candidate",
    layout: "hiring_review",
    brief:
      "Use a back header titled Applicant review. Review Sam Patel for Summer dog walker, active in interview, applied 2027-04-06. I marked Group handling as meets after volunteer walks; link to interview and offer. Add facts with Source: referral and a checklist with Contact references unchecked. Finish with Save review.",
  },
  {
    kind: "compose",
    archetype: "hiring_candidate",
    layout: "hiring_meeting",
    brief:
      "Use a back header titled Interview. Sam Patel's confirmed in-person Summer dog walker interview with Jo Ellis is at North Park entrance on 2027-04-12 at 09:30 for 30 minutes; link to edit. Add a facts row with Meeting point: South gate, a note entry field and a Save notes button.",
  },
  {
    kind: "compose",
    archetype: "hiring_candidate",
    layout: "hiring_terms",
    brief:
      "Use a back header titled Proposed terms. Draft Trot's offer to Sam Patel for Summer dog walker, 20 per hour, 20 hours weekly, start 2027-05-10, reply by 2027-05-01, subject to two references; link to edit. Display 20 as the separate Hourly pay figure and add a note: Check references before sending.",
  },
] satisfies ComposeProbe[];
