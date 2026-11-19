import { localeOf, type LDMLPluralRule } from "../lang";

export function numberLine(value: number, lang?: string): string {
  const locale = localeOf(lang);
  const notation = String(value).includes("e") ? "scientific" : "standard";
  const line = new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumSignificantDigits: 21,
    notation,
  }).format(value === 0 ? 0 : value);
  // Intl scientific notation uses E; the original default labels used JavaScript's e notation.
  if (notation === "scientific" && locale === localeOf()) return String(value);
  return line;
}

export function digitsLine(value: number, digits: number, lang?: string): string {
  return new Intl.NumberFormat(localeOf(lang), {
    useGrouping: false,
    minimumIntegerDigits: digits,
  }).format(value);
}

export function pluralForm(value: number, lang?: string): LDMLPluralRule {
  return new Intl.PluralRules(localeOf(lang)).select(value);
}

export function percentageLine(percent: number, lang?: string): string {
  return new Intl.NumberFormat(localeOf(lang), {
    style: "percent",
    useGrouping: false,
    maximumSignificantDigits: 21,
  }).format(percent / 100);
}
