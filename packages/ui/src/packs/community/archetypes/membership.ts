import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const membership = {
  id: "membership",
  job: "Keep the membership register and reconcile subscriptions",
  defaultLayout: "community_register",
  layouts: {
    community_register: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Members"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "m1", c: "Members" },
      ],
    },
    community_dues: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Dues"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "d1", c: "Dues" },
        { id: "n1", c: "Note" },
      ],
    },
    community_mod: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["ModQueue"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "m1", c: "ModQueue" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "membership",
    layout: "community_register",
    brief:
      "Head the screen Membership register. Add a search field with hint Find a member and filter chips All and Voting. In the register put Ana Reed, member ana, Secretary, joined 2024-03-12, with voting rights.",
  },
  {
    kind: "compose",
    archetype: "membership",
    layout: "community_dues",
    brief:
      "Head the screen Membership dues. Show the treasurer's ledger for 2026 subscriptions: ana_2026 for member ana, assessed 25 due 2026-04-01, with cash receipt receipt_1 against ana_2026, 10 on 2026-03-10. Add the note Enter receipts as they clear.",
  },
  {
    kind: "compose",
    archetype: "membership",
    layout: "community_mod",
    brief:
      "Head the screen Moderation. Review Ana Reed's pending application to join, id ana_join, submitted 2026-11-21T09:00:00Z. Ana wants to help at the seed swap. The rule is Members only. Add the note Decisions are shared with the committee.",
  },
] satisfies ComposeProbe[];
