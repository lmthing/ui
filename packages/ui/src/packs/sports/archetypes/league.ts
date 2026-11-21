import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const league = {
  id: "league",
  job: "The season",
  defaultLayout: "table",
  layouts: {
    table: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Standings"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "s2", c: "Standings" },
      ],
    },
    results: {
      writeHints: [
        'Make the final List a ranking with lead "number" and trail "value". Each row needs a title and one value, with no row trail override.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Fixtures"], required: true },
        { allow: ["SectionTitle"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "Fixtures" },
        { id: "s1", c: "SectionTitle" },
        { id: "l1", c: "List", lead: "number", trail: "value" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "league",
    layout: "table",
    brief:
      "League heading and a Table/Results switch with Table selected. Show Fern House (3 wins, 1 draw, 0 lost, 9 for, 2 against, form W W D W), Oakfield (2 wins, 2 draws, 0 lost, 7 for, 4 against, W D D W), and our Sunday Kickers (2 wins, 1 draw, 1 lost, 6 for, 5 against, D W L W). Highlight Kickers and put a promotion line after first.",
  },
  {
    kind: "compose",
    archetype: "league",
    layout: "results",
    brief:
      "Season results heading, then our fixture list: 2026-11-15 10:00 away at Fern House, lost 1–2, link fern_match; 2026-11-22 10:00 home versus Oakfield, won 3–0, link oak_match. Give the ranked list its own Top scorers section heading; top scorers Reed 5 and Woods 3.",
  },
] satisfies ComposeProbe[];
