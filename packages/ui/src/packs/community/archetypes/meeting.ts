import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const meeting = {
  id: "meeting",
  job: "Decide a group motion and record the decision",
  defaultLayout: "community_motion",
  layouts: {
    community_motion: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Vote"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "v1", c: "Vote" },
        { id: "n1", c: "Note" },
      ],
    },
    community_record: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Minutes"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "m1", c: "Minutes" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "meeting",
    layout: "community_motion",
    brief:
      "Call the screen Shed motion and give it a back button. We're voting to buy a shared tool shed; call the motion shed. Voting opens at 19:00 UTC and closes at 20:00 UTC on 18 November 2026. We need eight members and a simple majority. No one has voted yet. Note that only eligible members can vote.",
  },
  {
    kind: "compose",
    archetype: "meeting",
    layout: "community_record",
    brief:
      "Call the screen Meeting record and give it a back button. In the November committee minutes for 18 November 2026, Ana chaired. Link our decision to buy a shared tool shed to the closed motion named shed. We agreed to obtain quotes before ordering; Ana owns the unfinished follow-up, Obtain three quotes. The minutes aren't approved yet. Add a note saying we can still update follow-up actions after approval.",
  },
] satisfies ComposeProbe[];
