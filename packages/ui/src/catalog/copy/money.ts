import { itemsOf, placeholderValue, textsOf, thingOf } from "../cast";
import { isoDate } from "../props";
import type { CastLike } from "../types";
import { appointmentDate } from "./time";

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

/** Keep record prices readable even at the schema's largest finite value. */
export function compactMoneyLine(value: number, currency: Currency = defaultCurrency): string {
  if (value < 10000) return moneyLine(value, currency);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    notation: value < 1e15 ? "compact" : "scientific",
    maximumSignificantDigits: 3,
  }).format(value);
}

export const paymentLabels = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
  partial: "Part paid",
  mark: "Mark as paid",
  remind: "Remind",
} as const;
type Payment = {
  amount: number;
  paid?: number | undefined;
  date: string;
  due?: string | undefined;
  method?: string | undefined;
};

export const paymentToday = (): string => new Date().toISOString().slice(0, 10);

/** Settlement wins; any unpaid amount past its due date is overdue, including part payments. */
export function paymentStatus(
  input: Payment,
  today = paymentToday(),
): "paid" | "due" | "overdue" | "partial" {
  if ((input.paid ?? 0) >= input.amount) return "paid";
  if (input.due && input.due < today) return "overdue";
  return (input.paid ?? 0) > 0 ? "partial" : "due";
}

/** Record details use the same copy on screen and in the reading. */
export function paymentDetails(input: Payment): { part: string; text: string }[] {
  return [
    ...(input.paid === undefined ? [] : [{ part: "paid", text: `Received ${compactMoneyLine(input.paid)}` }]),
    { part: "date", text: `Date ${appointmentDate(input.date)}` },
    ...(input.due ? [{ part: "due", text: `Due ${appointmentDate(input.due)}` }] : []),
    ...(input.method ? [{ part: "method", text: input.method }] : []),
  ];
}

export function paymentReading(input: Payment): string[] {
  return [
    paymentLabels[paymentStatus(input)],
    compactMoneyLine(input.amount),
    String(input.amount),
    ...paymentDetails(input).map((line) => line.text),
    ...(input.paid === undefined ? [] : [String(input.paid)]),
    input.date,
    ...(input.due ? [input.due] : []),
  ];
}

/** Seed only a declared numeric value and valid dates; never infer a payment method from a name. */
export function paymentFallback(cast: CastLike): Payment {
  const item = itemsOf(cast, 1)[0];
  const thing = item && thingOf(cast, item.type);
  const keys =
    thing?.fields ?? Object.keys(item ?? {}).filter((key) => !["id", "type", "sample"].includes(key));
  const amount = keys
    .map((key) => item?.[key])
    .find((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  const dates = item ? textsOf(item, thing).filter((value) => isoDate.safeParse(value).success) : [];
  return {
    amount: amount ?? Number(placeholderValue),
    date: dates[0] ?? paymentToday(),
    ...(dates[1] ? { due: dates[1] } : {}),
  };
}
