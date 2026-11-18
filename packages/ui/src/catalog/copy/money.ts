/** The currencies a sum of money may be written in (ISO 4217), and the one used when none is given. */
export const currencies = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "INR",
  "AUD",
  "CAD",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "MXN",
  "BRL",
  "ZAR",
  "KRW",
  "TRY",
  "NZD",
] as const;
export type Currency = (typeof currencies)[number];
export const defaultCurrency: Currency = "USD";

const perWords = {
  hour: "hr",
  day: "day",
  night: "night",
  week: "week",
  month: "month",
  year: "year",
  each: "each",
  person: "person",
} as const;
export type PerWord = keyof typeof perWords | "none";

/** A sum of money, formatted for the currency: "$1,240.50", "€120 / night". Whole sums drop the cents. */
export function moneyLine(
  value: number,
  currency: Currency = defaultCurrency,
  per: PerWord = "none",
): string {
  const amount = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return per === "none" ? amount : `${amount} / ${perWords[per]}`;
}

/** A change with its direction: "+$32", "-€4.50", "+3.2%". */
export function changeLine(
  change: number,
  unit: "money" | "percent",
  currency: Currency = defaultCurrency,
): string {
  const sign = change > 0 ? "+" : change < 0 ? "-" : "";
  const size = Math.abs(change);
  return unit === "percent" ? `${sign}${size}%` : `${sign}${moneyLine(size, currency)}`;
}

/** The label a total carries when none is written. */
export const moneyLabels = { total: "Total" } as const;
