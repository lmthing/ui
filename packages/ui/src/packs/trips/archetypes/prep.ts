import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const prep = {
  id: "prep",
  job: "Getting ready",
  defaultLayout: "packing",
  layouts: {
    packing: {
      writeHints: [
        'For the countdown use Timer style "until", with until as the departure date and no seconds.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Timer"], required: true, variant: "until" },
        { allow: ["PackingList"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "Timer", style: "until", until: "2027-03-04", seconds: undefined },
        { id: "p1", c: "PackingList" },
      ],
    },
    tools: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Converter"], required: true },
        { allow: ["Clocks"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Converter" },
        { id: "c2", c: "Clocks" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "prep",
    layout: "packing",
    brief:
      "Get packed by the 2027-03-04 departure with a countdown and grouped tick lists for clothes and tech, including quantities.",
  },
  {
    kind: "compose",
    archetype: "prep",
    layout: "tools",
    brief:
      "Travel tools: editable currency amounts for home and Japan, and live local clocks for London and Tokyo.",
  },
] satisfies ComposeProbe[];
