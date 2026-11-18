/** A duration as a clock: "4:05", "21:00", "1:02:03". */
export function clockLine(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const [h, m, r] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(r)}` : `${m}:${two(r)}`;
}

/** Weekday initials, Monday first. */
export const weekdayInitials = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** A stored duration in minutes. */
export const durationLine = (minutes: number): string => `${minutes} min`;

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

/** Time left until a moment, from milliseconds: "23 days left", "5 h left", "12 min left" or "Passed". */
export function leftLine(ms: number): string {
  if (ms <= 0) return "Passed";
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  if (days >= 1) return `${days} ${days === 1 ? "day" : "days"} left`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h left`;
  return `${Math.max(1, minutes)} min left`;
}

/** How often something repeats, in the order a picker shows it. */
export const repeatOptions = ["never", "daily", "weekdays", "weekly", "monthly", "yearly"] as const;
export const repeatLabels = {
  never: "Never",
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
} as const satisfies Record<(typeof repeatOptions)[number], string>;

/** The controls of a player, and what is left of a recording: "-4:05". */
export const mediaLabels = {
  play: "Play",
  pause: "Pause",
  back: "Back 15 seconds",
  forward: "Forward 15 seconds",
} as const;
export const remainingLine = (seconds: number): string => `-${clockLine(seconds)}`;

/** Booking-time copy shared by the screen and its reading. */
export const slotLabels = { free: "free", taken: "taken", empty: "No free times" } as const;
export const slotDurationLine = (minutes: number): string => `${minutes} min`;

/** A local end time; +1d explicitly identifies a finish on the following day. */
export function slotEndLine(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number) as [number, number];
  const end = hours * 60 + mins + minutes;
  const two = (value: number) => String(value).padStart(2, "0");
  return `→ ${two(Math.floor((end % 1440) / 60))}:${two(end % 60)}${end >= 1440 ? " +1d" : ""}`;
}

/** Every grid time has a status line so its number aligns with the other cells. */
export function slotDetailLine(
  time: string,
  minutes: number,
  style: "grid" | "list",
  taken: boolean,
): string {
  return style === "grid"
    ? taken
      ? slotLabels.taken
      : slotLabels.free
    : `${slotEndLine(time, minutes)}${taken ? ` · ${slotLabels.taken}` : ""}`;
}

/** Hidden loading text retains the same line boxes without reading as real availability. */
export const slotLoadingLine = (line: string): string => "\u2007".repeat(line.length);
