import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const results = {
  id: "results",
  job: "Review practice results and learning milestones",
  defaultLayout: "result",
  layouts: {
    result: {
      recipe: [
        { allow: ["Result"], required: true },
        { allow: ["Streak"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "r1", c: "Result" },
        { id: "s1", c: "Streak" },
        { id: "b1", c: "Button" },
      ],
    },
    badges: {
      writeHints: [
        'Use List with lead "number" and trail "value", no style. Provide a short text value for each supplied score; set trail "none" on rows without a supplied score.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Achievements"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "a1", c: "Achievements" },
        { id: "l1", c: "List", lead: "number", trail: "value" },
      ],
    },
    class: {
      writeHints: [
        'Use List with lead "number" and trail "value", no style. Provide a short text value for each supplied score; set trail "none" on rows without a supplied score.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["People"], required: true },
        { allow: ["Progress"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "p1", c: "People" },
        { id: "p2", c: "Progress" },
        { id: "l1", c: "List", lead: "number", trail: "value" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "results",
    layout: "result",
    brief:
      "Show 9 correct out of 10, one mistake (reading 川 as yama instead of kawa), the study streak, and a Next practice button.",
  },
  {
    kind: "compose",
    archetype: "results",
    layout: "badges",
    brief:
      "Show earned and locked learning badges plus a ranked list. First kanji was earned on 2026-10-04; unlock Radical reader by mastering 20 water-radical characters. Rank Kai (90) then Jo (82).",
  },
  {
    kind: "compose",
    archetype: "results",
    layout: "class",
    brief:
      "Show a private class progress screen for Kai and Jo. The class completed 4 of 6 units; rank Kai (90) then Jo (82).",
  },
] satisfies ComposeProbe[];
