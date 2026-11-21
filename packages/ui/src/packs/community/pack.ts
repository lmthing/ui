import type { PackMeta } from "../../catalog";

export const pack = {
  id: "community",
  example: "Patch runs an allotment association's membership, annual dues, motions and minutes.",
  probes: [
    {
      kind: "pack",
      idea: "Run a residents' association: keep its official membership register and annual dues ledger, decide motions by quorum, and approve the minutes.",
      expect: ["community"],
    },
    {
      kind: "pack",
      idea: "Run a member-governed allotment club: keep voting rights, collect subscriptions and decide spending motions by recorded ballot.",
      expect: ["community"],
    },
    {
      kind: "pack",
      idea: "Organise one wedding with a guest list, invitations, RSVPs, seating and a gift registry. No ongoing club or member governance.",
      expect: ["events"],
    },
    {
      kind: "choose",
      need: "Pin one urgent water shutoff warning that people can dismiss. No membership or sign-ups.",
      expect: "Banner",
    },
  ],
} as const satisfies PackMeta;
