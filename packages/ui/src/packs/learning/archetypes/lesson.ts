import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const lesson = {
  id: "lesson",
  job: "Learn an idea and practise it",
  defaultLayout: "teach",
  layouts: {
    teach: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Steps"], required: true },
        { allow: ["Lesson"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Steps" },
        { id: "l1", c: "Lesson" },
      ],
    },
    quiz: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Steps"], required: true },
        { allow: ["Quiz"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Steps" },
        { id: "q1", c: "Quiz" },
      ],
    },
    cards: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Streak"], required: true },
        { allow: ["Flashcard"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Streak" },
        { id: "f1", c: "Flashcard" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "lesson",
    layout: "teach",
    brief:
      "Show step two of three. Teach the water radical, with a separate worked example of 海 (sea) containing 氵.",
  },
  {
    kind: "compose",
    archetype: "lesson",
    layout: "quiz",
    brief:
      "Show step two of three and check one multiple-choice question: Which reading means water? Options mizu and yama; the first is right.",
  },
  {
    kind: "compose",
    archetype: "lesson",
    layout: "cards",
    brief: "Show the study streak and two spaced-review cards: 水 → mizu (water), and 山 → yama (mountain).",
  },
] satisfies ComposeProbe[];
