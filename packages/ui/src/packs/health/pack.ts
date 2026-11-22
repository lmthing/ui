import type { PackMeta } from "../../catalog";

export const pack = {
  id: "health",
  example:
    "Rep logs a home workout set by set, daily activity goals and body-weight measurements on the phone.",
  probes: [
    {
      kind: "pack",
      idea: "A private gym log of exercises, weights, reps and rest between sets",
      expect: ["health"],
    },
    {
      kind: "pack",
      idea: "Track my medication doses, blood pressure readings and menstrual cycle locally",
      expect: ["health"],
    },
    {
      kind: "pack",
      idea: "A private mood journal with breathing exercises and sleep logs, not workouts or medicines",
      expect: ["mind"],
    },
    {
      kind: "pack",
      idea: "Plan meals, collect recipes and make a grocery list, without body tracking",
      expect: ["kitchen"],
    },
    {
      kind: "choose",
      need: "Show one circular daily step goal, 3000 of 8000, with no other goals or cycle tracking",
      expect: "Progress",
    },
  ],
} as const satisfies PackMeta;
