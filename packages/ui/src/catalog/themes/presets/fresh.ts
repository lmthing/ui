import type { PresetMeta } from "../../meta";

export const fresh = {
  id: "fresh",
  mood: "Bright and clean",
  font: "grotesk",
  numbers: "regular",
  weight: "regular",
  shape: "soft",
  density: "regular",
  surface: "soft",
  roles: {
    light: {
      bg: "#eaf4f6",
      surface: "#ffffff",
      raised: "#e2eef1",
      line: "#bbd5db",
      text: "#112a31",
      muted: "#425f68",
      good: "#286440",
      warn: "#86530b",
      bad: "#a52f24",
    },
    dark: {
      bg: "#102027",
      surface: "#19313b",
      raised: "#1e363f",
      line: "#3d5c66",
      text: "#edfbff",
      muted: "#b8d5de",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
