import type { PackMeta } from "../../catalog";

export const pack = {
  id: "kitchen",
  example:
    "Supper keeps family recipes, scales ingredients, plans meals and tracks groceries and pantry food.",
  probes: [
    {
      kind: "pack",
      idea: "A family recipe box with scaled ingredients and several cooking timers",
      expect: ["kitchen"],
    },
    {
      kind: "pack",
      idea: "Plan home meals for the week, buy groceries and track food in the fridge",
      expect: ["kitchen"],
    },
    {
      kind: "pack",
      idea: "A bakery selling bread with a basket and customer orders, not home cooking",
      expect: ["commerce"],
    },
    {
      kind: "choose",
      need: "Run one six-minute countdown, with start and stop. No recipe steps or other timers.",
      expect: "Timer",
    },
  ],
} as const satisfies PackMeta;
