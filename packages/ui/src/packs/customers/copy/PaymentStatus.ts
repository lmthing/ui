import { customersWordsFor } from "../lang";
import {
  appointmentDate,
  compactMoneyLine,
  isoDate,
  itemsOf,
  wordsFor,
  placeholderValue,
  textsOf,
  thingOf,
  type CastLike,
} from "../../../catalog";

export const { paymentLabels } = customersWordsFor();
type Payment = {
  amount: number;
  paid?: number | undefined;
  date: string;
  due?: string | undefined;
  method?: string | undefined;
};

export const paymentToday = (): string => new Date().toISOString().slice(0, 10);
export const paymentAmountLine = (amount: number, lang?: string): string =>
  `${wordsFor(lang).moneyLabels.total} ${compactMoneyLine(amount, undefined, lang)}`;

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
export function paymentDetails(input: Payment, lang?: string): { part: string; text: string }[] {
  const words = customersWordsFor(lang);
  return [
    ...(input.paid === undefined
      ? []
      : [{ part: "paid", text: words.received(compactMoneyLine(input.paid, undefined, lang)) }]),
    { part: "date", text: words.paymentDate(appointmentDate(input.date, lang)) },
    ...(input.due ? [{ part: "due", text: words.paymentDue(appointmentDate(input.due, lang)) }] : []),
    ...(input.method ? [{ part: "method", text: input.method }] : []),
  ];
}

export function paymentReading(input: Payment, lang?: string): string[] {
  const { paymentLabels } = customersWordsFor(lang);
  return [
    paymentLabels[paymentStatus(input)],
    paymentAmountLine(input.amount, lang),
    String(input.amount),
    ...paymentDetails(input, lang).map((line) => line.text),
    ...(input.paid === undefined ? [] : [String(input.paid)]),
    input.date,
    ...(input.due ? [input.due] : []),
    ...((input.paid ?? 0) < input.amount ? [paymentLabels.mark, paymentLabels.remind] : []),
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
