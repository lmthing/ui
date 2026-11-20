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
      "Head the screen Shed motion with a back button. Motion voteId shed: Buy a shared tool shed, opens 2026-11-18T19:00:00Z and closes 2026-11-18T20:00:00Z, quorum 8, simple majority, no ballots yet. Add the note Only eligible members can vote.",
  },
  {
    kind: "compose",
    archetype: "meeting",
    layout: "community_record",
    brief:
      "Head the screen Meeting record with a back button. Show November committee minutes on 2026-11-18 chaired by ana, with decision shed_purchase titled Buy a shared tool shed, text Obtain quotes before ordering, linked to closed motion shed. Action quotes for shed_purchase: Obtain three quotes, owner ana, not done. Not approved yet. End with the note Follow-up actions can still be updated after approval.",
  },
] satisfies ComposeProbe[];
