import { placeholderTitle, type ArchetypeMeta, type ComposeProbe } from "../../../catalog";

export const queue = {
  id: "queue",
  job: "Triage and dispatch service requests",
  defaultLayout: "requests_active",
  layouts: {
    requests_active: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["RequestQueue"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "q1", c: "RequestQueue" },
        { id: "b1", c: "Button" },
      ],
    },
    requests_triage: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Card"], required: true },
        { allow: ["RequestTriage"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "d1", c: "Card" },
        { id: "t1", c: "RequestTriage" },
        { id: "n1", c: "Note" },
      ],
    },
    requests_dispatch: {
      writeHints: [
        'Use two Field lines with kind "time" for start and end. Match both values to the WorkOrder window; the button saves assignment, not completion.',
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Field"], required: true, variant: "choice" },
        { allow: ["Field"], required: true, variant: "date" },
        { allow: ["Field"], required: true, variant: "time" },
        { allow: ["Field"], required: true, variant: "time" },
        { allow: ["WorkOrder"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "f1", c: "Field", kind: "choice", options: [placeholderTitle(0), placeholderTitle(1)] },
        { id: "f2", c: "Field", kind: "date" },
        { id: "f3", c: "Field", kind: "time" },
        { id: "f4", c: "Field", kind: "time" },
        { id: "w1", c: "WorkOrder" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "queue",
    layout: "requests_active",
    brief:
      "Show a repair desk heading, a text search, filter chips for All and Urgent, a status-grouped active queue with one urgent new ticket SR-41 Slipping chain, opened 2026-11-19 at 09:00, due 2026-11-20 at 16:00 and link chain, and a New report button.",
  },
  {
    kind: "compose",
    archetype: "queue",
    layout: "requests_triage",
    brief:
      "Triage with a back heading, a summary card, a triage decision for SR-41 Slipping chain (reported urgent, impact one, priority normal; Drivetrain or Brakes, choose Drivetrain; no duplicates), then a short note that routing doesn't yet assign a technician.",
  },
  {
    kind: "compose",
    archetype: "queue",
    layout: "requests_dispatch",
    brief:
      "Dispatch with a back heading, a technician dropdown with Ella or Noor, a work date (2026-11-20), two distinct time fields for Start 13:00 and End 14:00, work order WO-12 for SR-41 Replace the chain with one required unchecked test and zero minutes logged, then a Save assignment button.",
  },
] satisfies ComposeProbe[];
