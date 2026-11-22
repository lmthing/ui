import { compactMoneyLine, durationLine, moneyLine, numberLine } from "../../../catalog";
import { bookingWordsFor } from "../lang";
/** The cue on an offering that opens its booking flow. */
export const { bookLabel } = bookingWordsFor();

export function servicePrice(price: number, lang?: string) {
  return moneyLine(price, undefined, undefined, lang);
}

export const serviceCapacity = (capacity: number, lang?: string): string =>
  bookingWordsFor(lang).serviceCapacity(numberLine(capacity, lang));

export const serviceDeposit = (deposit: number, lang?: string): string =>
  bookingWordsFor(lang).serviceDeposit(serviceDepositAmount(deposit, lang));

export const serviceDepositAmount = (deposit: number, lang?: string): string =>
  compactMoneyLine(deposit, undefined, lang);

export function serviceReading(
  services: readonly {
    minutes: number;
    price?: number | undefined;
    capacity?: number | undefined;
    deposit?: number | undefined;
    portfolio?: { goto: string } | undefined;
  }[],
  lang?: string,
) {
  const { bookLabel, servicePortfolio } = bookingWordsFor(lang);
  return services.flatMap(({ minutes, price, capacity = 1, deposit, portfolio }) => [
    durationLine(minutes, lang),
    ...(price === undefined ? [] : [servicePrice(price, lang)]),
    ...(capacity > 1 ? [serviceCapacity(capacity, lang)] : []),
    ...(deposit === undefined ? [] : [serviceDeposit(deposit, lang)]),
    bookLabel,
    ...(portfolio ? [servicePortfolio] : []),
  ]);
}
