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
type Installment = { date: string; amount: number };
type Payment = {
  amount: number;
  paid?: number | undefined;
  date: string;
  due?: string | undefined;
  method?: string | undefined;
  installments?: readonly Installment[] | undefined;
  showLink?: boolean | undefined;
};

export function installmentLine(row: Installment, lang?: string) {
  return {
    date: appointmentDate(row.date, lang),
    amount: compactMoneyLine(row.amount, undefined, lang),
  };
}

export function paymentPaid({ paid, installments }: Payment): number | undefined {
  if (paid !== undefined || !installments?.length) return paid;
  const total = installments.reduce((sum, { amount }) => sum + amount, 0);
  // Remove floating-point noise without multiplying sums at extreme magnitudes.
  return Number(total.toFixed(2));
}

export const paymentToday = (): string => new Date().toISOString().slice(0, 10);
export const paymentAmountLine = (amount: number, lang?: string): string =>
  `${wordsFor(lang).moneyLabels.total} ${compactMoneyLine(amount, undefined, lang)}`;

/** Settlement wins; any unpaid amount past its due date is overdue, including part payments. */
export function paymentStatus(
  input: Payment,
  today = paymentToday(),
): "paid" | "due" | "overdue" | "partial" {
  const paid = paymentPaid(input) ?? 0;
  if (paid >= input.amount) return "paid";
  if (input.due && input.due < today) return "overdue";
  return paid > 0 ? "partial" : "due";
}

/** Record details use the same copy on screen and in the reading. */
export function paymentDetails(input: Payment, lang?: string): { part: string; text: string }[] {
  const words = customersWordsFor(lang);
  const paid = paymentPaid(input);
  return [
    ...(paid === undefined
      ? []
      : [{ part: "paid", text: words.received(compactMoneyLine(paid, undefined, lang)) }]),
    { part: "date", text: words.paymentDate(appointmentDate(input.date, lang)) },
    ...(input.due ? [{ part: "due", text: words.paymentDue(appointmentDate(input.due, lang)) }] : []),
    ...(input.method ? [{ part: "method", text: input.method }] : []),
  ];
}

export function paymentReading(input: Payment, lang?: string): string[] {
  const { paymentLabels } = customersWordsFor(lang);
  const paid = paymentPaid(input);
  return [
    paymentLabels[paymentStatus(input)],
    paymentAmountLine(input.amount, lang),
    String(input.amount),
    ...paymentDetails(input, lang).map((line) => line.text),
    ...(paid === undefined ? [] : [String(paid)]),
    input.date,
    ...(input.due ? [input.due] : []),
    ...(input.installments?.length
      ? [
          paymentLabels.installments,
          ...input.installments.flatMap((row) => Object.values(installmentLine(row, lang))),
        ]
      : []),
    ...(input.showLink ? [paymentLabels.link, paymentLabels.copy, paymentLabels.share] : []),
    ...((paid ?? 0) < input.amount ? [paymentLabels.mark, paymentLabels.remind] : []),
  ];
}

/** Seed only a declared numeric value and valid dates; never infer a payment method from a name. */
export function paymentFallback(cast: CastLike): Pick<Payment, "amount" | "date" | "due"> {
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
