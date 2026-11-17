// Neutral content for fallbacks when the cast has nothing to offer. Never domain samples.
export const placeholderTitles = [
  "Item one",
  "Item two",
  "Item three",
  "Item four",
  "Item five",
  "Item six",
] as const;
export const placeholderDetail = "Details";
export const placeholderLabel = "Continue";
export const placeholderValue = "0";

export function placeholderTitle(index: number): string {
  return placeholderTitles[index % placeholderTitles.length]!;
}
