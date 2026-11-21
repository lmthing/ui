import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

const previewUntil = "2030-06-14";

export const plan_event = {
  id: "plan_event",
  job: "See one event at a glance and finish the planning jobs",
  defaultLayout: "overview",
  layouts: {
    overview: {
      writeHints: ['Use Timer with style "until" and an ISO date in until. Leave seconds null.'],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Timer"], required: true, variant: "until" },
        { allow: ["Checklist"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "Timer", style: "until", until: previewUntil, seconds: undefined },
        { id: "c1", c: "Checklist" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "plan_event",
    layout: "overview",
    brief: `Title the wedding overview Vows. Count down until ${previewUntil}, show a checklist with Book hall done and Confirm menu still to do, then an Open guest list button linking to guests.`,
  },
] satisfies ComposeProbe[];
