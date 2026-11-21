import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const event = {
  id: "event",
  job: "See one community gathering or group challenge",
  defaultLayout: "event",
  layouts: {
    event: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["EventCard"], required: true },
        { allow: ["Comments"], required: true },
        { allow: ["Composer"], required: true, variant: "reply" },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "e1", c: "EventCard" },
        { id: "c1", c: "Comments" },
        { id: "c2", c: "Composer", style: "reply" },
      ],
    },
    challenge: {
      writeHints: [
        'For the ranking use List with style null, lead "number", trail "value" and a score in each ranked row’s value.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Challenge"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Challenge" },
        { id: "l1", c: "List", lead: "number", trail: "value" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "event",
    layout: "event",
    brief:
      "Back header, community swap card for 2026-11-28 at 14:00 with 14 going to the greenhouse, comments about the gathering, and a reply box.",
  },
  {
    kind: "compose",
    archetype: "event",
    layout: "challenge",
    brief:
      "Header, a shared 30-cutting propagation goal ending 2026-11-30 with 18 rooted, then a numbered leaderboard with Maya on eight, Sam on six and Jo on four.",
  },
] satisfies ComposeProbe[];
