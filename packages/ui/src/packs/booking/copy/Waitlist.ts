import { localeOf, numberLine, pluralForm } from "../../../catalog";
import { bookingWordsFor } from "../lang";

export const { queueLabels } = bookingWordsFor();

const queuePeopleLine = (ahead: number, lang?: string): string =>
  bookingWordsFor(lang).queuePeople(numberLine(ahead, lang), pluralForm(ahead, lang));

export function queueAhead(ahead: number, lang?: string): string {
  return ahead > 999
    ? bookingWordsFor(lang).queueCompact(queueCount(ahead, lang))
    : queuePeopleLine(ahead, lang);
}

export function queueSize(count: number, lang?: string, exact = false): string {
  const label = exact ? numberLine(count, lang) : queueCount(count, lang);
  return bookingWordsFor(lang).queueTotal(label, pluralForm(count, lang));
}

export function queueCount(count: number, lang?: string): string {
  if (count <= 999) return numberLine(count, lang);
  const quadrillion = count >= 1e15;
  const line = new Intl.NumberFormat(localeOf(lang), {
    notation: "compact",
    maximumSignificantDigits: 3,
  }).format(quadrillion ? count / 1e15 : count);
  return quadrillion ? bookingWordsFor(lang).quadrillion(line) : line;
}

export function queueExact(ahead: number, position?: number, lang?: string): string {
  const words = bookingWordsFor(lang);
  return [
    position !== undefined ? words.queuePosition(words.queueLabels.position, numberLine(position, lang)) : "",
    queuePeopleLine(ahead, lang),
  ]
    .filter(Boolean)
    .join("; ");
}
