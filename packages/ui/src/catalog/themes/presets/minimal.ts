import type { PresetMeta } from "../../meta";

export const minimal = {
  id: "minimal",
  mood: "Precise and restrained",
  font: "grotesk",
  numbers: "regular",
  weight: "regular",
  shape: "soft",
  density: "compact",
  surface: "hairline",
  roles: {
    light: {
      bg: "#f6f7f9",
      surface: "#ffffff",
      raised: "#edeff3",
      accentSoft: "#dde1e7",
      line: "#d3d8e0",
      text: "#191e29",
      muted: "#525d70",
      good: "#286440",
      warn: "#86530b",
      bad: "#a52f24",
    },
    dark: {
      bg: "#13151a",
      surface: "#1a1e26",
      raised: "#242a35",
      accentSoft: "#3e454f",
      line: "#414c5d",
      text: "#f0f3f9",
      muted: "#b8c2d1",
      good: "#83cca0",
      warn: "#f2c775",
      bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
