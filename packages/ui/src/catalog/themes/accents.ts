import type { AccentMeta } from "../meta";

export const moss = {
  id: "moss",
  light: { accent: "#3e6d30", accentSoft: "#e4eedd", onAccent: "#ffffff" },
  dark: { accent: "#8fc178", accentSoft: "#354b2c", onAccent: "#10170c" },
} as const satisfies AccentMeta;
export const forest = {
  id: "forest",
  light: { accent: "#205b43", accentSoft: "#deefe5", onAccent: "#ffffff" },
  dark: { accent: "#76d4ab", accentSoft: "#153b2d", onAccent: "#0b1e16" },
} as const satisfies AccentMeta;
export const teal = {
  id: "teal",
  light: { accent: "#006362", accentSoft: "#d8f2f0", onAccent: "#ffffff" },
  dark: { accent: "#62ded2", accentSoft: "#123a39", onAccent: "#082120" },
} as const satisfies AccentMeta;
export const sky = {
  id: "sky",
  light: { accent: "#17649a", accentSoft: "#e0effa", onAccent: "#ffffff" },
  dark: { accent: "#86c8f5", accentSoft: "#17324a", onAccent: "#0b1720" },
} as const satisfies AccentMeta;
export const indigo = {
  id: "indigo",
  light: { accent: "#3e4aa1", accentSoft: "#e7ebfc", onAccent: "#ffffff" },
  dark: { accent: "#acb8ff", accentSoft: "#272e56", onAccent: "#141931" },
} as const satisfies AccentMeta;
export const violet = {
  id: "violet",
  light: { accent: "#69429a", accentSoft: "#f0e6fa", onAccent: "#ffffff" },
  dark: { accent: "#d1a9ff", accentSoft: "#392850", onAccent: "#231238" },
} as const satisfies AccentMeta;
export const rose = {
  id: "rose",
  light: { accent: "#9a345f", accentSoft: "#fae4ef", onAccent: "#ffffff" },
  dark: { accent: "#ff9dc6", accentSoft: "#482439", onAccent: "#381228" },
} as const satisfies AccentMeta;
export const coral = {
  id: "coral",
  light: { accent: "#a03e32", accentSoft: "#fde8e1", onAccent: "#ffffff" },
  dark: { accent: "#ffa78f", accentSoft: "#482923", onAccent: "#361810" },
} as const satisfies AccentMeta;
export const amber = {
  id: "amber",
  light: { accent: "#805002", accentSoft: "#fff0c9", onAccent: "#ffffff" },
  dark: { accent: "#ffc35b", accentSoft: "#443219", onAccent: "#2e1d03" },
} as const satisfies AccentMeta;
export const sand = {
  id: "sand",
  light: { accent: "#685739", accentSoft: "#f3ead7", onAccent: "#ffffff" },
  dark: { accent: "#d9c29a", accentSoft: "#393226", onAccent: "#292114" },
} as const satisfies AccentMeta;
export const slate = {
  id: "slate",
  light: { accent: "#475971", accentSoft: "#e5ebf2", onAccent: "#ffffff" },
  dark: { accent: "#b5c6da", accentSoft: "#2b3441", onAccent: "#182230" },
} as const satisfies AccentMeta;
export const ink = {
  id: "ink",
  light: { accent: "#272635", accentSoft: "#eae9ee", onAccent: "#ffffff" },
  dark: { accent: "#eeecf4", accentSoft: "#353340", onAccent: "#201f29" },
} as const satisfies AccentMeta;
export const accents = [
  moss,
  forest,
  teal,
  sky,
  indigo,
  violet,
  rose,
  coral,
  amber,
  sand,
  slate,
  ink,
] as const;
