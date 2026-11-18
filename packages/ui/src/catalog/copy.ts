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

/** A total over a chart: "Total 23 walks", or "Total 23" without a unit. */
export function totalLine(total: number, unit?: string): string {
  return unit ? `Total ${total} ${unit}` : `Total ${total}`;
}

/** The direction of a trend from its first to its last point: "rising", "falling" or "steady". */
export function trendWord(points: readonly number[]): "rising" | "falling" | "steady" {
  const [first, last] = [points[0] ?? 0, points[points.length - 1] ?? 0];
  return last > first ? "rising" : last < first ? "falling" : "steady";
}

/** Accessible names for the two buttons of a counter. */
export const stepLabels = { less: "One less", more: "One more" } as const;

/** A duration as a clock: "4:05", "21:00", "1:02:03". */
export function clockLine(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const [h, m, r] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(r)}` : `${m}:${two(r)}`;
}

/** Weekday initials, Monday first. */
export const weekdayInitials = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** The two buttons of a timer. */
export const timerLabels = { start: "Start", stop: "Stop" } as const;

const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** A streak as read text: ["12 days", "done Mon, Tue, Wed"] (or "none done this week"). */
export function streakLine(count: number, days: readonly boolean[]): string[] {
  const done = weekdayNames.filter((_, index) => days[index]).map((name) => name.slice(0, 3));
  return [
    `${count} ${count === 1 ? "day" : "days"}`,
    done.length ? `done ${done.join(", ")}` : "none done this week",
  ];
}

/** Photo actions: add one to a field, take one, scan a code. */
export const photoLabels = { add: "Add photo", take: "Take photo", scan: "Scan" } as const;

/** Time left until a moment, from milliseconds: "23 days left", "5 h left", "12 min left" or "Passed". */
export function leftLine(ms: number): string {
  if (ms <= 0) return "Passed";
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  if (days >= 1) return `${days} ${days === 1 ? "day" : "days"} left`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h left`;
  return `${Math.max(1, minutes)} min left`;
}
