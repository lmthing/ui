import type { PresetMeta } from "../../meta";

export const calm = {
  id: "calm",
  mood: "Quiet and airy",
  font: "humanist",
  numbers: "regular",
  weight: "regular",
  shape: "soft",
  density: "airy",
  surface: "flat",
  roles: {
    light: {
      bg: "#f4f5f1",
      surface: "#fafbf7",
      raised: "#eef1ea",
      line: "#d2d9cc",
      text: "#1b221e",
      muted: "#5a665e",
      good: "#286440",
      warn: "#86530b",
      bad: "#a52f24",
    },
    dark: {
      bg: "#121614",
      surface: "#1a201d",
      raised: "#222b25",
      line: "#3f4d43",
      text: "#f1f6ef",
      muted: "#b2c0b6",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
