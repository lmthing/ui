import type { PackMeta } from "../../catalog";

export const pack = {
  id: "learning",
  example: "Kanji Drop teaches Japanese characters, checks readings and schedules flashcard reviews.",
  probes: [
    {
      kind: "pack",
      idea: "Teach me Japanese characters with short lessons, graded questions and spaced flashcard review.",
      expect: ["learning"],
    },
    {
      kind: "pack",
      idea: "A student planner with a repeating weekly class timetable, homework deadlines and grades.",
      expect: ["learning"],
    },
    {
      kind: "pack",
      idea: "Run a café staff rota: assign baristas to shifts, track their hours and leave shift handover notes. No lessons or quizzes.",
      expect: ["team"],
    },
    {
      kind: "choose",
      need: "Show how many days in a row I've practised and which days this week I kept the habit.",
      expect: "Streak",
    },
  ],
} as const satisfies PackMeta;
