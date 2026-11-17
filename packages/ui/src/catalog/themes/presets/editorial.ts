import type { PresetMeta } from "../../meta";

export const editorial = {
  id: "editorial",
  mood: "Like a magazine",
  font: "serif",
  numbers: "regular",
  weight: "regular",
  shape: "sharp",
  density: "airy",
  surface: "hairline",
  roles: {
    light: {
      bg: "#fbf7ef",
      surface: "#fffdf8",
      raised: "#f2ece1",
      line: "#d0c6b6",
      text: "#28231d",
      muted: "#62594d",
      good: "#286440",
      warn: "#86530b",
      bad: "#a52f24",
    },
    dark: {
      bg: "#181512",
      surface: "#221e19",
      raised: "#2c261f",
      line: "#5c5042",
      text: "#fff8eb",
      muted: "#c9bda9",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
