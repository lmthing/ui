import type { PresetMeta } from "../../meta";

export const playful = {
  id: "playful",
  mood: "Friendly and bouncy",
  font: "rounded",
  numbers: "regular",
  weight: "regular",
  shape: "round",
  density: "regular",
  surface: "tinted",
  roles: {
    light: {
      bg: "#fff0dd",
      surface: "#fffaf3",
      raised: "#f9e0e9",
      line: "#e3bfd1",
      text: "#392542",
      muted: "#685569",
      good: "#286440",
      warn: "#86530b",
      bad: "#a52f24",
    },
    dark: {
      bg: "#23182c",
      surface: "#35223e",
      raised: "#442c4e",
      line: "#71527d",
      text: "#fff0fc",
      muted: "#dcc3e6",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
