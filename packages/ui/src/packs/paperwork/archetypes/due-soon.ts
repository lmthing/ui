import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const due_soon = {
  id: "due_soon",
  job: "Act before paperwork deadlines",
  defaultLayout: "paperwork_due",
  layouts: {
    paperwork_due: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Calendar"], required: true, variant: "week" },
        { allow: ["Renewals"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Calendar", style: "week" },
        { id: "r1", c: "Renewals" },
        { id: "b1", c: "Button" },
      ],
    },
    paperwork_renewal: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Renewals"], required: true, variant: "cards" },
        { allow: ["Field"], required: true, variant: "date" },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "r1", c: "Renewals", style: "cards" },
        { id: "f1", c: "Field", kind: "date" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "due_soon",
    layout: "paperwork_due",
    brief:
      "Title Paperwork due. Show a week calendar for January 2027 marking day 12. Track Alex's liability cover with notice on 2027-01-12 and expiry on 2027-02-01, not completed. Add a Renewal details button opening paperwork_renewal.",
  },
  {
    kind: "compose",
    archetype: "due_soon",
    layout: "paperwork_renewal",
    brief:
      "Use a back header titled Liability renewal. Show a separate renewal card naming both dates for Alex's liability cover: notice 2027-01-12, ends 2027-02-01. Add a date input labelled Notice date, set to 2027-01-12, a note saying Renew with your insurer, and a Save date button.",
  },
] satisfies ComposeProbe[];
