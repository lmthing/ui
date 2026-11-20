import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const trip = {
  id: "trip",
  job: "One trip at a glance",
  defaultLayout: "overview",
  layouts: {
    overview: {
      writeHints: [
        'For the countdown use Timer style "until", with until as the departure date and no seconds.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Timer"], required: true, variant: "until" },
        { allow: ["Weather"], required: true },
        { allow: ["Itinerary"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "Timer", style: "until", until: "2027-03-04", seconds: undefined },
        { id: "w1", c: "Weather" },
        { id: "i1", c: "Itinerary" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "trip",
    layout: "overview",
    brief:
      "Overview of Japan: count down to departure on 2027-03-04, show Tokyo's forecast, a foldable itinerary for Tokyo and Kyoto, and a button to get ready.",
  },
] satisfies ComposeProbe[];
