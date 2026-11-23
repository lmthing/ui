import type { PresetMeta } from "../../meta";

export const night = {
  id: "night",
  mood: "Dark first, glowing accent",
  font: "grotesk",
  numbers: "regular",
  weight: "regular",
  shape: "soft",
  density: "regular",
  surface: "raised",
  roles: {
    light: {
      bg: "#ebedf9",
      surface: "#f9f9ff",
      raised: "#e2e6f7",
      line: "#c3cbe7",
      text: "#20263e",
      muted: "#515c79",
      good: "#286440",
      warn: "#86530b",
      bad: "#a52f24",
    },
    dark: {
      bg: "#101126",
      surface: "#1f2240",
      raised: "#2b3155",
      line: "#4c5782",
      text: "#f1f1ff",
      muted: "#c0c7e9",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
