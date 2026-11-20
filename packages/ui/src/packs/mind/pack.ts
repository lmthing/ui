import type { PackMeta } from "../../catalog";

export const pack = {
  id: "mind",
  example: "Tide records moods, feelings and sleep privately, with paced breathing and calming sounds.",
  probes: [
    {
      kind: "pack",
      idea: "A private daily mood diary with feeling words and a reflection journal",
      expect: ["mind"],
    },
    {
      kind: "pack",
      idea: "An evening wind-down app with paced breathing, layered calming sounds and a sleep log",
      expect: ["mind"],
    },
    {
      kind: "pack",
      idea: "Track strength workouts, medication doses and blood pressure, not moods or sleep",
      expect: ["health"],
    },
    {
      kind: "choose",
      need: "Give me one five-face rating from very low to very good for how today felt, without asking me to name any feelings.",
      expect: "Scale",
    },
  ],
} as const satisfies PackMeta;
