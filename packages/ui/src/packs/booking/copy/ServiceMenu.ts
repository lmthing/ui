import { durationLine, moneyLine } from "../../../catalog";
import { bookingWordsFor } from "../lang";
/** The cue on an offering that opens its booking flow. */
export const { bookLabel } = bookingWordsFor();

export function servicePrice(price: number, lang?: string) {
  return moneyLine(price, undefined, undefined, lang);
}

export function serviceReading(
  services: readonly { minutes: number; price?: number | undefined }[],
  lang?: string,
) {
  const { bookLabel } = bookingWordsFor(lang);
  return services.flatMap(({ minutes, price }) => [
    durationLine(minutes, lang),
    ...(price === undefined ? [] : [servicePrice(price, lang)]),
    bookLabel,
  ]);
}
