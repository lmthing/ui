import type { PresetMeta } from "../../meta";

export const mono = {
  id: "mono",
  mood: "Black and white, one accent",
  font: "grotesk",
  numbers: "regular",
  weight: "regular",
  shape: "soft",
  density: "regular",
  surface: "monochrome",
  roles: {
    light: {
      bg: "#f4f4f4",
      surface: "#ffffff",
      raised: "#e8e8e8",
      line: "#c9c9c9",
      text: "#181818",
      muted: "#555555",
      good: "#286440",
      warn: "#86530b",
      bad: "#a52f24",
    },
    dark: {
      bg: "#141414",
      surface: "#1e1e1e",
      raised: "#292929",
      line: "#484848",
      text: "#f5f5f5",
      muted: "#c2c2c2",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
