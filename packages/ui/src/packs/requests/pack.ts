import type { PackMeta } from "../../catalog";

export const pack = {
  id: "requests",
  example: "Spoke takes a slipping-chain report through triage, repair, updates and verification.",
  probes: [
    {
      kind: "pack",
      idea: "Run a school facilities help desk: triage maintenance reports, assign work orders, and reopen tickets if fixes fail.",
      expect: ["requests"],
    },
    {
      kind: "pack",
      idea: "An internal support desk for reported problems: keep a deadline-ordered ticket queue, post staff-only notes, and verify each fix before closing.",
      expect: ["requests"],
    },
    {
      kind: "pack",
      idea: "Let clients choose a free time to book a haircut and see the confirmed appointment. No repair reports or work orders.",
      expect: ["booking"],
    },
    {
      kind: "choose",
      need: "Count down live to the Friday bike collection date. Just show how much time is left until that date.",
      expect: "Timer",
    },
  ],
} as const satisfies PackMeta;
