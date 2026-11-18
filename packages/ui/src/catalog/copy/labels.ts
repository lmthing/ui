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

/** Photo actions: add one to a field, take one, scan a code. */
export const photoLabels = { add: "Add photo", take: "Take photo", scan: "Scan" } as const;

/** A growing text box shows how much is left: "42 / 600". */
export function charLine(used: number, max: number): string {
  return `${used} / ${max}`;
}

/** The send button of a reply. */
export const sendLabel = "Send";

/** The button that closes a sheet or a toast. */
export const closeLabel = "Close";

/** The note a read gives a button that asks before it acts. */
export const confirmNote = "asks first";
export const confirmLabel = "Confirm";
export const cancelLabel = "Cancel";
export const mediaUnavailable = "Recording unavailable";

export const swipeLabels = { left: "Skip", right: "Keep" } as const;

export const allLabel = "All";
