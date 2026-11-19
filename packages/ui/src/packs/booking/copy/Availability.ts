import { bookingWordsFor } from "../lang";
/** Neutral working-week defaults and labels for paired time controls. */
export const availabilityDefaults = { from: "09:00", to: "17:00" } as const;
export const { availabilityLabels } = bookingWordsFor();
export const breakLine = (from: string, to: string, lang?: string): string =>
  `${bookingWordsFor(lang).availabilityLabels.break} ${from}–${to}`;
