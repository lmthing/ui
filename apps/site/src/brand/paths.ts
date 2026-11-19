// The logo as plain data, so the React page and the build-time PNGs draw the same thing.
// Mark: a phone outline holding three stacked part-rectangles (the address registry); the middle one is the accent.
export const markOutline = { x: 8, y: 2, width: 24, height: 36, rx: 6 };
export const markParts = [
  { x: 12.5, y: 8, width: 15, height: 6, accent: false },
  { x: 12.5, y: 17, width: 15, height: 11, accent: true },
  { x: 12.5, y: 31, width: 8, height: 3.5, accent: false },
] as const;

// Wordmark: lowercase monoline letters on a 36-unit line, drawn as paths. The dots of the i are the accent,
// then a slanted address slash and `ui`.
export const wordStrokes = [
  "M3 3V20C3 23 4.5 24 8 24",
  "M11 12V24M11 17C11 11.5 19 11.5 19 17V24M19 17C19 11.5 27 11.5 27 17V24",
  "M37 6V19C37 23 39 24 42 24M33 12H42",
  "M49 3V24M49 17C49 11.5 57 11.5 57 17V24",
  "M65 12V24",
  "M72 12V24M72 17C72 11.5 80 11.5 80 17V24",
  "M97 18A6 6 0 1 0 85 18A6 6 0 1 0 97 18M97 12V27C97 32 93 33 89 32",
  "M121 12V19C121 25 129 25 129 19M129 12V24",
  "M136 12V24",
] as const;
export const wordSlash = "M106 33L116 -2";
export const wordDots = [65, 136] as const;
export const wordWidth = 142;

const rect = (r: { x: number; y: number; width: number; height: number }, extra: string) =>
  `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" ${extra}/>`;

/** The mark as a standalone SVG string. */
export function markSvg(ink: string, accent: string, size = 40): string {
  const o = markOutline;
  const parts = markParts.map((p) => rect(p, `rx="1.2" fill="${p.accent ? accent : ink}"`)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${size}" height="${size}">${rect(o, `rx="${o.rx}" fill="none" stroke="${ink}" stroke-width="3"`)}${parts}</svg>`;
}

/** The wordmark as a standalone SVG string. */
export function wordSvg(ink: string, accent: string, height = 36): string {
  const strokes = wordStrokes.map((d) => `<path d="${d}"/>`).join("");
  const dots = wordDots
    .map((x) => `<circle cx="${x}" cy="5" r="2.7" fill="${accent}" stroke="none"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -2 ${wordWidth} 40" height="${height}" fill="none" stroke="${ink}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${strokes}<path d="${wordSlash}" stroke="${accent}"/>${dots}</svg>`;
}
