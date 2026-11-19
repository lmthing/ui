/** Booking-time copy shared by the screen and its reading. */
export const slotLabels = { free: "free", taken: "taken", empty: "No free times" } as const;

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
