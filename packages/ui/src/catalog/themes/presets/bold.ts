import type { PresetMeta } from "../../meta";

export const bold = {
  id: "bold",
  mood: "High contrast, big type",
  font: "grotesk",
  numbers: "regular",
  shape: "sharp",
  density: "compact",
  surface: "solid",
  roles: {
    light: {
      bg: "#efefec",
      surface: "#ffffff",
      raised: "#e6e6e2",
      line: "#cdcdc8",
      text: "#0d0d0d",
      muted: "#4a4a47",
      good: "#1f6a3c",
      warn: "#8a4f00",
      bad: "#b3261e",
    },
    dark: {
      bg: "#000000",
      surface: "#161616",
      raised: "#222222",
      line: "#3d3d3d",
      text: "#ffffff",
      muted: "#bdbdbd",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
