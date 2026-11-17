export const type = {
  display: { size: 34, lineHeight: 40, weight: "700" },
  title: { size: 26, lineHeight: 32, weight: "700" },
  heading: { size: 19, lineHeight: 24, weight: "600" },
  body: { size: 16, lineHeight: 22, weight: "400" },
  label: { size: 14, lineHeight: 18, weight: "500" },
  caption: { size: 12, lineHeight: 16, weight: "500" },
  number: { size: 40, lineHeight: 44, weight: "700" },
} as const;
export const fontFamilies = {
  humanist: "'Source Sans 3', 'Segoe UI', sans-serif",
  grotesk: "Inter, Helvetica, Arial, sans-serif",
  rounded: "Nunito, 'Arial Rounded MT Bold', sans-serif",
  serif: "'Source Serif 4', Georgia, serif",
  serifHeading: "Fraunces, Georgia, serif",
  condensed: "'Barlow Condensed', 'Arial Narrow', sans-serif",
} as const;
export type FontName = keyof typeof fontFamilies;
