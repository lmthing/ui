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

/** Provider-local dates, independent of the viewer's timezone. */
export function appointmentDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export const minutesLine = (minutes: number): string => `${minutes} min`;
