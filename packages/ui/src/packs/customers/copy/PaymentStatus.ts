import {
  appointmentDate,
  compactMoneyLine,
  isoDate,
  itemsOf,
  moneyLabels,
  placeholderValue,
  textsOf,
  thingOf,
  type CastLike,
} from "../../../catalog";

export const paymentLabels = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
  partial: "Part paid",
  mark: "Mark as paid",
  remind: "Remind",
  updated: "Update complete",
} as const;
type Payment = {
  amount: number;
  paid?: number | undefined;
  date: string;
  due?: string | undefined;
  method?: string | undefined;
};

export const paymentToday = (): string => new Date().toISOString().slice(0, 10);
export const paymentAmountLine = (amount: number): string =>
  `${moneyLabels.total} ${compactMoneyLine(amount)}`;

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
    paymentAmountLine(input.amount),
    String(input.amount),
    ...paymentDetails(input).map((line) => line.text),
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
