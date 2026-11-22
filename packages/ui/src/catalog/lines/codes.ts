export const lineCodes = {
  fence: "R1.fence",
  quotes: "R1.quotes",
  comma: "R1.comma",
  close: "R1.close",
  parseDrop: "R1.drop",
  componentDrop: "R2.drop",
  strip: "R2.strip",
  fill: "R2.fill",
  variant: "R2.variant",
  enum: "R2.enum",
  icon: "R2.icon",
  photo: "R2.photo",
  text: "R2.text",
  array: "R2.array",
  migrate: "R2.migrate",
} as const;

export type LineCode = (typeof lineCodes)[keyof typeof lineCodes];
