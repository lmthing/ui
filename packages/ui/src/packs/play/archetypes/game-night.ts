import type { ArchetypeMeta } from "../../../catalog";

export const game_night = {
  id: "game_night",
  job: "Set up and play together",
  defaultLayout: "play_teams",
  layouts: {
    play_teams: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["TeamPicker"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "TeamPicker" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
    play_turns: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["TurnOrder"], required: true },
        { allow: ["Card"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "TurnOrder" },
        { id: "c1", c: "Card" },
        { id: "b1", c: "Button" },
      ],
    },
    play_chance: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Dice"], required: true },
        { allow: ["SectionTitle"], required: true },
        { allow: ["Spinner"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "d1", c: "Dice" },
        { id: "s1", c: "SectionTitle" },
        { id: "s2", c: "Spinner" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
