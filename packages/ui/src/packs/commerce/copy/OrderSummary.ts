import { appointmentDate, documentTotals, moneyLine, quantityLine, totalLine } from "../../../catalog";
import { commerceWordsFor, type CommerceWords } from "../lang";

type Line = { name: string; qty: number; price: number };
type Receipt = {
  number: string;
  date: string;
  lines: readonly Line[];
  mode: keyof CommerceWords["orderMode"];
  place?: string | undefined;
  detail?: "full" | "brief" | undefined;
};

export function receiptLine(line: Line, detail: Receipt["detail"], lang?: string) {
  const words = commerceWordsFor(lang);
  return {
    name: line.name,
    qty: quantityLine(line.qty, lang),
    price:
      detail === "brief"
        ? undefined
        : words.cart.unitPrice(moneyLine(line.price, undefined, undefined, lang, "fixed")),
    extended: moneyLine(documentTotals({ lines: [line] }).total, undefined, undefined, lang, "fixed"),
  };
}

export function receiptCopy({ number, date, mode, place, lines }: Receipt, lang?: string) {
  const words = commerceWordsFor(lang);
  const amount = documentTotals({ lines }).total;
  return {
    number: words.orderNumber(number),
    date: appointmentDate(date, lang),
    mode: words.orderMode[mode],
    place,
    total: moneyLine(amount, undefined, undefined, lang, "fixed"),
    amount,
  };
}

export function receiptReading(input: Receipt, state: string, lang?: string): string[] {
  if (state !== "filled") return [];
  const { number, date, mode, place, total, amount } = receiptCopy(input, lang);
  const words = commerceWordsFor(lang);
  const lines = input.lines.flatMap((line) => {
    const { name, qty, price, extended } = receiptLine(line, input.detail, lang);
    return [name, price ? `${qty}${words.receiptSeparator}${price}` : qty, extended];
  });
  const fulfillment = place ? `${mode}${words.receiptSeparator}${place}` : mode;
  return [
    number,
    date,
    fulfillment,
    ...lines,
    words.orderTotal,
    total,
    totalLine(amount, undefined, lang),
    words.reorder,
  ];
}
