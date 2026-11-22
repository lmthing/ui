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

/** Keep the numeric line separate from the availability status in every layout. */
export function slotLabelLine(
  time: string,
  minutes: number,
  layout: "grid" | "rows" | "ranges",
  lang?: string,
): string {
  if (layout === "ranges") return `${time}–${slotEnd(time, minutes, lang)}`;
  return layout === "rows" ? `${time} ${slotEndLine(time, minutes, lang)}` : time;
}
