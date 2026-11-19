import { digitsLine } from "../../../catalog";
import { bookingWordsFor } from "../lang";
/** Booking-time copy shared by the screen and its reading. */
export const { slotLabels } = bookingWordsFor();

/** A local end time; +1d explicitly identifies a finish on the following day. */
export function slotEndLine(time: string, minutes: number, lang?: string): string {
  const [hours, mins] = time.split(":").map(Number) as [number, number];
  const end = hours * 60 + mins + minutes;
  const two = (value: number) => digitsLine(value, 2, lang);
  return `→ ${two(Math.floor((end % 1440) / 60))}:${two(end % 60)}${end >= 1440 ? bookingWordsFor(lang).slotTomorrow : ""}`;
}

/** Every grid time has a status line so its number aligns with the other cells. */
export function slotDetailLine(
  time: string,
  minutes: number,
  style: "grid" | "list",
  taken: boolean,
  lang?: string,
): string {
  const { slotLabels } = bookingWordsFor(lang);
  return style === "grid"
    ? taken
      ? slotLabels.taken
      : slotLabels.free
    : `${slotEndLine(time, minutes, lang)}${taken ? ` · ${slotLabels.taken}` : ""}`;
}

/** Hidden loading text retains the same line boxes without reading as real availability. */
export const slotLoadingLine = (line: string): string => "\u2007".repeat(line.length);
