import type { PackMeta } from "../../catalog";

export const pack = {
  id: "projects",
  example:
    "Folio tracks a freelance website delivery from agreed scope through task dependencies, milestone acceptance and logged time.",
  probes: [
    {
      kind: "pack",
      idea: "A private app for my one-off website project: agree what I will deliver, finish linked tasks, and mark each delivery gate when I accept its required outputs. No billing or staff shifts.",
      expect: ["projects"],
    },
    {
      kind: "pack",
      idea: "Help me deliver an exhibition installation for opening night. Some jobs overlap and others must wait for earlier jobs. I need to sign off each deliverable by its deadline and log my own time against each job until I hand over the finished installation.",
      expect: ["projects"],
    },
    {
      kind: "pack",
      idea: "Run day-to-day back-office operations using sortable record tables, a kanban board and operational reports. No bounded project, delivery gates, or staff shifts.",
      expect: ["data"],
    },
    {
      kind: "choose",
      need: "A short list of independent jobs to tick off, with no subtasks, shared project or dependencies.",
      expect: "Checklist",
    },
  ],
} as const satisfies PackMeta;
