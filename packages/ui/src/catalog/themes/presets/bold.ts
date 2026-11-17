import type { PresetMeta } from "../../meta";

export const bold = {
  id: "bold",
  mood: "High contrast, big type",
  font: "grotesk",
  numbers: "regular",
  shape: "sharp",
  density: "compact",
  surface: "solid-accent",
  roles: {
    light: {
      bg: "#ffffff",
      surface: "#f6f6f6",
      raised: "#eeeeee",
      line: "#bcbcbc",
      text: "#101010",
      muted: "#4b4b4b",
      good: "#24633d",
      warn: "#87500a",
      bad: "#a52626",
    },
    dark: {
      bg: "#090909",
      surface: "#191919",
      raised: "#242424",
      line: "#555555",
      text: "#ffffff",
      muted: "#c6c6c6",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
