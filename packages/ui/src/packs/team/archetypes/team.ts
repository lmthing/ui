import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const team = {
  id: "team",
  job: "My shift today",
  defaultLayout: "today",
  layouts: {
    today: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["TimeClock"], required: true },
        { allow: ["Shift"], required: true },
        { allow: ["Handover"], required: true },
        { allow: ["Checklist"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "TimeClock" },
        { id: "s1", c: "Shift" },
        { id: "h2", c: "Handover" },
        { id: "c1", c: "Checklist" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "team",
    layout: "today",
    brief:
      "Build My shift today: a heading, a work clock already clocked in at 07:00 for Opening, one confirmed Barista shift at Grind on 2026-11-16 from 07:00 to 13:00 with Lee, an unseen handover from Lee at 06:50 saying Oat milk low, and tickable opening jobs Unlock the door and Set out the sign.",
  },
] satisfies ComposeProbe[];
