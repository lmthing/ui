import { wordsFor, type ArchetypeMeta, type ComposeProbe } from "../../../catalog";

export const noticeboard = {
  id: "noticeboard",
  job: "Share group news and organise member contributions",
  defaultLayout: "community_board",
  layouts: {
    community_board: {
      writeHints: ['Use List style "expand" and give each notice row a body.'],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Card"], required: true },
        { allow: ["SectionTitle"], required: true },
        { allow: ["List"], required: true, variant: "expand" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Card" },
        { id: "s1", c: "SectionTitle" },
        {
          id: "l1",
          c: "List",
          style: "expand",
          rows: [{ title: wordsFor().placeholderLabel, body: wordsFor().placeholderDetail }],
        },
        { id: "b1", c: "Button" },
      ],
    },
    community_contributions: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["SignUpSheet"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "SignUpSheet" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "noticeboard",
    layout: "community_board",
    brief:
      "Head the screen Patch notices. Pin one card titled Water supply off with Water returns at noon. Add a Recent notices section label and an expandable notice, Seed swap, with the body Meet at the gate on Sunday. Finish with a Bring something button linking to contributions.",
  },
  {
    kind: "compose",
    archetype: "noticeboard",
    layout: "community_contributions",
    brief:
      "Head the screen Seed swap. Add a contribution sheet titled What to bring with slot tables, Bring a folding table, capacity 2, with one place already claimed by ana. Add a short note: Drop contributions off by 9 am.",
  },
] satisfies ComposeProbe[];
