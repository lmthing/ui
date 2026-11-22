import type { PresetMeta } from "../../meta";

export const sport = {
  id: "sport",
  mood: "Energetic, numbers first",
  font: "grotesk",
  numbers: "condensed",
  weight: "regular",
  shape: "sharp",
  density: "compact",
  surface: "solid",
  roles: {
    light: {
      bg: "#eef2f7",
      surface: "#ffffff",
      raised: "#dce5ef",
      line: "#b7c6d8",
      text: "#111b29",
      muted: "#455871",
      good: "#286440",
      warn: "#86530b",
      bad: "#a52f24",
    },
    dark: {
      bg: "#0b111b",
      surface: "#162337",
      raised: "#202f46",
      line: "#46607d",
      text: "#f6faff",
      muted: "#b9cee6",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
