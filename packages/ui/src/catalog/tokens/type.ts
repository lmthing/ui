const steps = {
  title: { size: 22, lineHeight: 28, weight: "700", tracking: -0.5 },
  body: { size: 15, lineHeight: 21, weight: "400", tracking: 0 },
  label: { size: 13, lineHeight: 18, weight: "500", tracking: 0 },
  caption: { size: 12, lineHeight: 16, weight: "400", tracking: 0 },
  number: { size: 32, lineHeight: 36, weight: "700", tracking: -0.8 },
} as const;

export const type = {
  ...steps,
  // Keep role names and finishes, but no legacy role introduces a sixth size.
  display: { ...steps.number, tracking: -0.7 },
  heading: { ...steps.body, weight: "600", tracking: -0.2 },
} as const;

/** Semantic steps for layout recipes; legacy KitText roles remain available to existing views. */
export const layoutType = {
  title: "title",
  body: "body",
  meta: "label",
  figure: "number",
  caption: "caption",
} as const satisfies Record<string, keyof typeof steps>;

export const fontFamilies = {
  humanist: "'Source Sans 3 Variable', 'Source Sans 3', 'Segoe UI', system-ui, sans-serif",
  grotesk: "'Inter Variable', Inter, 'Helvetica Neue', Arial, sans-serif",
  rounded: "'Nunito Variable', Nunito, 'Arial Rounded MT Bold', system-ui, sans-serif",
  serif: "'Source Serif 4 Variable', 'Source Serif 4', Georgia, serif",
  serifHeading: "'Fraunces Variable', Fraunces, Georgia, serif",
  condensed: "'Barlow Condensed', 'Arial Narrow', sans-serif",
} as const;
export type FontName = keyof typeof fontFamilies;
