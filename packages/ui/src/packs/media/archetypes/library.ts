import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const library = {
  id: "library",
  job: "Browse or resume my saved reading and listening",
  defaultLayout: "covers",
  layouts: {
    covers: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Library"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "l1", c: "Library" },
      ],
    },
    home: {
      writeHints: ["Each horizontal shelf must use List with style shelf and at least two photo rows."],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Stats"], required: true },
        { allow: ["SectionTitle"], required: true },
        { allow: ["List"], required: true, variant: "shelf" },
        { allow: ["SectionTitle"], required: true },
        { allow: ["List"], required: true, variant: "shelf" },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Stats" },
        { id: "t1", c: "SectionTitle" },
        { id: "l1", c: "List", style: "shelf" },
        { id: "t2", c: "SectionTitle" },
        { id: "l2", c: "List", style: "shelf" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "library",
    layout: "covers",
    brief:
      "Saved audio: show a screen heading, a two-view switch (Shows or Books), then a cover grid with Morning Readings (lib:morning, 25% listened, opens morning) and Notes by the River (lib:river, badge New, opens river).",
  },
  {
    kind: "compose",
    archetype: "library",
    layout: "home",
    brief:
      "Pew homepage: a screen heading, then two summary numbers (84 minutes listened and 3 sermons finished). Below those, put a Latest section heading and a horizontal shelf of A Quiet Morning (lib:morning) and Work of Patience (lib:patience). Then a Series section heading and a separate horizontal shelf of Ordinary Time (lib:ordinary) and Songs for the Road (lib:songs). Each shelf scrolls sideways and shows both supplied photos.",
  },
] satisfies ComposeProbe[];
