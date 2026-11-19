import type { PackMeta } from "../../catalog";

export const pack = {
  id: "home",
  example: "Ledge shares recurring plant care and household jobs, with thermostat, sensor and scene mocks.",
  probes: [
    {
      kind: "pack",
      idea: "A household organiser for flatmates: recurring chores with owners and points, and whose turn it is to take out the bins",
      expect: ["home"],
    },
    {
      kind: "pack",
      idea: "A home panel for connected lights, a thermostat's live reading and set point, a humidity sensor and saved multi-device scenes",
      expect: ["home"],
    },
    {
      kind: "pack",
      idea: "A café manager planning employee shifts, hours and handovers. No household jobs.",
      expect: ["team"],
    },
    {
      kind: "choose",
      need: "Tick off my own three jobs for today. No owners, repeat schedule, points or shared rotation.",
      expect: "Checklist",
    },
  ],
} as const satisfies PackMeta;
