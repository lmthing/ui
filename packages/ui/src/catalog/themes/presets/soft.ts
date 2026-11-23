import type { PresetMeta } from "../../meta";

export const soft = {
  id: "soft",
  mood: "Gentle pastels",
  font: "rounded",
  numbers: "regular",
  weight: "regular",
  shape: "round",
  density: "airy",
  surface: "pastel",
  roles: {
    light: {
      bg: "#f4eef9",
      surface: "#fdf9ff",
      raised: "#f0e8f6",
      line: "#d9c9e5",
      text: "#332739",
      muted: "#64556e",
      good: "#286440",
      warn: "#86530b",
      bad: "#a52f24",
    },
    dark: {
      bg: "#201b28",
      surface: "#2e2637",
      raised: "#3a3044",
      line: "#5d4c6a",
      text: "#faf0fc",
      muted: "#d3c4db",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
