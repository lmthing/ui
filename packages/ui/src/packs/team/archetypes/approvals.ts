import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const approvals = {
  id: "approvals",
  job: "Requests and hours",
  defaultLayout: "requests",
  layouts: {
    requests: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Approval"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "a1", c: "Approval" },
      ],
    },
    hours: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Timesheet"], required: true },
        { allow: ["Bars"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "Timesheet" },
        { id: "b1", c: "Bars" },
      ],
    },
    request: {
      writeHints: [
        'Use two date inputs: each Field uses kind "date". Use Composer style "entry", not "reply".',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Choice"], required: true },
        { allow: ["Field"], required: true, variant: "date" },
        { allow: ["Field"], required: true, variant: "date" },
        { allow: ["Composer"], required: true, variant: "entry" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Choice" },
        { id: "f1", c: "Field", kind: "date" },
        { id: "f2", c: "Field", kind: "date" },
        { id: "c2", c: "Composer", style: "entry" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "approvals",
    layout: "requests",
    brief:
      "Show a Requests heading, a switch with Requests selected and Hours second, then Lee's Monday off request for 23 Nov with lib:people photo, note Rae can cover, and manager approve and decline buttons.",
  },
  {
    kind: "compose",
    archetype: "approvals",
    layout: "hours",
    brief:
      "Show a Weekly hours heading, then the 16–22 Nov hours awaiting approval for Lee: 6, 0, 5, 0, 7, 0, 0 Monday through Sunday. Finish with a bar chart for all staff with Mon 12, Wed 11 and Fri 14 hours.",
  },
  {
    kind: "compose",
    archetype: "approvals",
    layout: "request",
    brief:
      "Show Request time off, a choice between Day off and Shift swap, two date fields From and To each set to 2026-11-23, a multiline entry labelled Note with hint Add a note for your manager, then a Send request button.",
  },
] satisfies ComposeProbe[];
