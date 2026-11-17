import type { PresetMeta } from "../../meta";

export const calm = {
  id: "calm", mood: "Quiet and airy", font: "humanist", numbers: "regular",
  shape: "soft", density: "airy", surface: "flat-tinted",
  roles: {
    light: {
      bg: "#f7f8f5", surface: "#ffffff", raised: "#edf1ea", line: "#d9e1d5",
      text: "#1c2420", muted: "#505e54", good: "#286440", warn: "#86530b", bad: "#a52f24",
    },
    dark: {
      bg: "#121614", surface: "#1a201d", raised: "#222b25", line: "#3f4d43",
      text: "#f1f6ef", muted: "#b2c0b6", good: "#83cca0", warn: "#f2c775", bad: "#ffa59a",
    },
  },
} as const satisfies PresetMeta;
