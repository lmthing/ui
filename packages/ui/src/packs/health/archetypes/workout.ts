import type { ArchetypeMeta } from "../../../catalog";

export const workout = {
  id: "workout",
  job: "A session",
  defaultLayout: "log",
  layouts: {
    log: {
      writeHints: ['The session Timer counts up: write style "up" and seconds 0, with until and at null.'],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Timer"], required: true, variant: "up" },
        { allow: ["Workout"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "Timer", style: "up" },
        { id: "w1", c: "Workout" },
      ],
    },
    cardio: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["CardioSession"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "CardioSession" },
        { id: "n1", c: "Note" },
      ],
    },
    plan: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["TrainingPlan"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "p1", c: "TrainingPlan" },
        { id: "n1", c: "Note" },
      ],
    },
    exercise: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Exercise"], required: true },
        { allow: ["Stats"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "e1", c: "Exercise" },
        { id: "s1", c: "Stats" },
      ],
    },
    history: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Calendar"], required: true, variant: "month" },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Calendar", style: "month" },
        { id: "l1", c: "List" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
