export const type = {
  display: { size: 34, lineHeight: 40, weight: "700", tracking: -0.6 },
  title: { size: 26, lineHeight: 32, weight: "700", tracking: -0.4 },
  heading: { size: 18, lineHeight: 24, weight: "600", tracking: -0.2 },
  body: { size: 16, lineHeight: 22, weight: "400", tracking: 0 },
  label: { size: 14, lineHeight: 20, weight: "500", tracking: 0 },
  caption: { size: 13, lineHeight: 18, weight: "400", tracking: 0 },
  number: { size: 40, lineHeight: 44, weight: "700", tracking: -1 },
} as const;
export const fontFamilies = {
  humanist: "'Source Sans 3 Variable', 'Source Sans 3', 'Segoe UI', system-ui, sans-serif",
  grotesk: "'Inter Variable', Inter, 'Helvetica Neue', Arial, sans-serif",
  rounded: "'Nunito Variable', Nunito, 'Arial Rounded MT Bold', system-ui, sans-serif",
  serif: "'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif",
  serifHeading: "'Fraunces Variable', Fraunces, Georgia, serif",
  condensed: "'Barlow Condensed', 'Arial Narrow', sans-serif",
} as const;
export type FontName = keyof typeof fontFamilies;
