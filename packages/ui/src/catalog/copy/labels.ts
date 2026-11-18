// The only user-facing words the ui itself writes. Views never contain literal text.
import { compactMoneyLine } from "./money";
import { appointmentDate, minutesLine } from "./time";

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

export const appointmentLabels = {
  reschedule: "Reschedule",
  edit: "Edit details",
  booked: "Booked",
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
  done: "Done",
} as const;

/** Optional record details, in the same order on screen and in an agent's reading. */
export function appointmentDetails(input: {
  with?: string | undefined;
  minutes: number;
  place?: string | undefined;
  price?: number | undefined;
  policy?: string | undefined;
}) {
  return Object.entries({
    with: input.with,
    minutes: minutesLine(input.minutes),
    place: input.place,
    price: input.price !== undefined ? compactMoneyLine(input.price) : undefined,
    policy: input.policy,
  }).flatMap(([part, text]) => (text ? [{ part, text }] : []));
}

/** Keep a short final word with the word before it, without changing the copy. */
export const balancedLine = (text: string): string => text.replace(/ (\S+)$/, "\u00a0$1");

export function appointmentReading(
  input: Parameters<typeof appointmentDetails>[0] & {
    date: string;
    time: string;
    style: "card" | "summary";
    status: keyof typeof appointmentLabels;
  },
): string[] {
  return [
    appointmentDate(input.date),
    input.date,
    input.time,
    ...appointmentDetails(input).map((line) => line.text),
    ...(input.price !== undefined ? [String(input.price)] : []),
    ...(input.style === "card"
      ? [appointmentLabels[input.status], appointmentLabels.reschedule, cancelLabel]
      : [appointmentLabels.edit]),
  ];
}
/** The cue on an offering that opens its booking flow. */
export const bookLabel = "Book";

/** A record's event kind and calendar date, kept together below its title. */
export const historyDetailLine = (kind: string, date: string): string => `${kind} · ${date}`;
