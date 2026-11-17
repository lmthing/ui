// The only user-facing words the ui itself writes. Views never contain literal text.

function plural(word: string): string {
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/** Empty-state line: "No plants yet" for a known thing type, else "Nothing here yet". */
export function emptyLine(thingType?: string): string {
  const word = thingType?.replace(/[_-]+/g, " ").trim().toLowerCase();
  return word ? `No ${plural(word)} yet` : "Nothing here yet";
}

/** Accessibility label for a component drawn in its loading state. */
export const loadingLabel = "Loading";

/** The goal under a progress number: "of 5". */
export function goalLine(of: number): string {
  return `of ${of}`;
}

/** Place in a sequence: "Step 2 of 3". */
export function stepLine(at: number, count: number): string {
  return `Step ${at} of ${count}`;
}
