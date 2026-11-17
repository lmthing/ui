import type { AccentMeta } from "../meta";

export const moss = {
  id: "moss",
  light: { accent: "#3e6d30", accentSoft: "#e4eedd", onAccent: "#ffffff" },
  dark: { accent: "#8fc178", accentSoft: "#26331f", onAccent: "#10170c" },
} as const satisfies AccentMeta;
export const sky = {
  id: "sky",
  light: { accent: "#17649a", accentSoft: "#e0effa", onAccent: "#ffffff" },
  dark: { accent: "#86c8f5", accentSoft: "#17324a", onAccent: "#0b1720" },
} as const satisfies AccentMeta;
export const accents = [moss, sky] as const;
