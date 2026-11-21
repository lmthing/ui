import type { PackMeta } from "../../catalog";

export const pack = {
  id: "team",
  example: "Grind schedules café staff, fills open shifts, records hours and hands over to the next shift.",
  probes: [
    {
      kind: "pack",
      idea: "Run a café staff rota: see who works each day, let baristas claim unstaffed shifts and approve worked hours.",
      expect: ["team"],
    },
    {
      kind: "pack",
      idea: "Schedule volunteers for food bank shifts, collect clock-ins, and pass handover notes to the next crew. No public events or client appointments.",
      expect: ["team"],
    },
    {
      kind: "pack",
      idea: "Manage a Sunday football squad: select players for matches, record scores and track league standings. No staffing, shifts or hours.",
      expect: ["sports"],
    },
    {
      kind: "choose",
      need: "Tick off opening jobs like unlocking the door and putting out the sign. No shift times, requests or notes from other staff.",
      expect: "Checklist",
    },
  ],
} as const satisfies PackMeta;
