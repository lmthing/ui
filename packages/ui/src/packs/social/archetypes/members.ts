import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const members = {
  id: "members",
  job: "Find, follow or invite community members",
  defaultLayout: "list",
  layouts: {
    list: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["People"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "p1", c: "People" },
      ],
    },
    member: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Profile"], required: true },
        { allow: ["Stats"], required: true },
        { allow: ["Button"], required: true },
        { allow: ["Feed"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "p1", c: "Profile" },
        { id: "s1", c: "Stats", arrange: "grid" },
        { id: "b1", c: "Button" },
        { id: "f1", c: "Feed" },
      ],
    },
    invite: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Invite"], required: true },
        { allow: ["People"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "i1", c: "Invite" },
        { id: "p1", c: "People" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "members",
    layout: "list",
    brief: "Members title, a search by name, and a roster with Maya and Sam and their roles.",
  },
  {
    kind: "compose",
    archetype: "members",
    layout: "member",
    brief:
      "Back header, Maya’s profile, a compact row of three totals for posts, followers and following, one Follow button, then Maya’s two latest shared updates.",
  },
  {
    kind: "compose",
    archetype: "members",
    layout: "invite",
    brief:
      "Title, a card to copy or share code FERN28 with a QR and six joins, then a roster of Maya and Sam.",
  },
] satisfies ComposeProbe[];
