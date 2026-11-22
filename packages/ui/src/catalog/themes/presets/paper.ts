import type { PresetMeta } from "../../meta";

export const paper = {
  id: "paper",
  mood: "A notebook in ink",
  font: "serif",
  numbers: "regular",
  weight: "regular",
  shape: "sharp",
  density: "regular",
  surface: "hairline",
  roles: {
    light: {
      bg: "#f7f5e6",
      surface: "#fffdf2",
      raised: "#eeead7",
      line: "#c1baa5",
      text: "#292a24",
      muted: "#585749",
      good: "#286440",
      warn: "#86530b",
      bad: "#a52f24",
    },
    dark: {
      bg: "#1b1c18",
      surface: "#272822",
      raised: "#303127",
      line: "#575849",
      text: "#f8f4e5",
      muted: "#c8c5b3",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
