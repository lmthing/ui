import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const club = {
  id: "club",
  job: "Our next match",
  defaultLayout: "next",
  layouts: {
    next: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Fixtures"], required: true, variant: "next" },
        { allow: ["Squad"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "Fixtures", style: "next" },
        { id: "s1", c: "Squad" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "club",
    layout: "next",
    brief:
      "Header Sunday Kickers. Show one large next-match card for River Rovers at home, 2026-11-22 10:00 at Mill Field, meet 09:40, blue kit; link to sunday_match. Need five players; I am Ella (local:1, yes), Reed (local:2, yes), and Moss (local:3, maybe). Finish with a View match button linking to sunday_match.",
  },
] satisfies ComposeProbe[];
