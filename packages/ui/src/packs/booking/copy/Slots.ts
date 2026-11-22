import { digitsLine } from "../../../catalog";
import { bookingWordsFor } from "../lang";
/** Booking-time copy shared by the screen and its reading. */
export const { slotLabels } = bookingWordsFor();

/** A local end time with a qualifier for finishes on the following day. */
function slotEnd(time: string, minutes: number, lang?: string): string {
  const [hours, mins] = time.split(":").map(Number) as [number, number];
  const end = hours * 60 + mins + minutes;
  const two = (value: number) => digitsLine(value, 2, lang);
  return `${two(Math.floor((end % 1440) / 60))}:${two(end % 60)}${end >= 1440 ? bookingWordsFor(lang).slotTomorrow : ""}`;
}

export const slotEndLine = (time: string, minutes: number, lang?: string): string =>
  `→ ${slotEnd(time, minutes, lang)}`;

export const slotRangeLine = (time: string, minutes: number, lang?: string): string =>
  `${time}–${slotEnd(time, minutes, lang)}`;

/** Read the status in the grid and the computed end and status in rows. */
export function slotDetailLine(
  time: string,
  minutes: number,
  arrange: "grid" | "rows",
  taken: boolean,
  lang?: string,
): string {
  const { slotLabels } = bookingWordsFor(lang);
  return arrange === "grid"
    ? taken
      ? slotLabels.taken
      : slotLabels.free
    : `${slotEndLine(time, minutes, lang)}${taken ? ` · ${slotLabels.taken}` : ""}`;
}
