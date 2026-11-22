import type { PresetMeta } from "../../meta";

export const warm = {
  id: "warm",
  mood: "Cosy, paper tones",
  font: "humanist",
  numbers: "regular",
  weight: "regular",
  shape: "round",
  density: "regular",
  surface: "solid",
  roles: {
    light: {
      bg: "#f2e8db",
      surface: "#fff6e8",
      raised: "#ecddc9",
      line: "#cfbaa2",
      text: "#34231a",
      muted: "#665142",
      good: "#286440",
      warn: "#86530b",
      bad: "#a52f24",
    },
    dark: {
      bg: "#231914",
      surface: "#32241c",
      raised: "#3e2d22",
      line: "#695240",
      text: "#fff0df",
      muted: "#d6baa3",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
