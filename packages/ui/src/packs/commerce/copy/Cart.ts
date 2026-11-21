import { documentFieldLine, documentTotals, moneyLine, quantityLine, totalLine } from "../../../catalog";
import { commerceWordsFor } from "../lang";

type Line = { name: string; variant?: string | undefined; qty: number; price: number };
type CartCopy = {
  lines: readonly Line[];
  delivery?: number | undefined;
  detail?: "full" | "brief" | undefined;
};

function cartMoney(amount: number, lang?: string) {
  return moneyLine(amount, undefined, undefined, lang, "fixed");
}

export function cartLineCopy(line: Line, detail?: CartCopy["detail"], lang?: string) {
  const words = commerceWordsFor(lang);
  const unitPrice = words.cart.unitPrice(cartMoney(line.price, lang));
  const variant = detail === "brief" ? undefined : line.variant;
  return {
    price: cartMoney(documentTotals({ lines: [line] }).total, lang),
    note: variant ? [variant, unitPrice].join(words.receiptSeparator) : unitPrice,
    unitPrice,
    variant,
  };
}

function cartTotalAmount({ lines, delivery }: CartCopy) {
  return documentTotals({ lines: [...lines, { qty: 1, price: delivery ?? 0 }] }).total;
}

export function cartTotals({ lines, delivery }: CartCopy, lang?: string) {
  const words = commerceWordsFor(lang).cart;
  const { subtotal } = documentTotals({ lines });
  const total = cartTotalAmount({ lines, delivery });
  return [
    { part: "subtotal", label: words.subtotal, amount: cartMoney(subtotal, lang) },
    ...(delivery === undefined
      ? []
      : [{ part: "delivery", label: words.delivery, amount: cartMoney(delivery, lang) }]),
    { part: "total", label: words.total, amount: cartMoney(total, lang) },
  ];
}

export function cartReading(input: CartCopy, state: string, lang?: string) {
  const words = commerceWordsFor(lang).cart;
  if (state !== "filled") return [];
  const lines = input.lines.flatMap((line) => {
    const { note, price } = cartLineCopy(line, input.detail, lang);
    return [documentFieldLine(line.name, quantityLine(line.qty, lang), lang), note, price];
  });
  return [
    ...lines,
    words.promo,
    // Keep the legacy delivery and unformatted total readings alongside the visible copy.
    ...cartTotals(input, lang).flatMap(({ part, label, amount }) =>
      part === "delivery"
        ? [label, documentFieldLine(words.deliveryReading, amount, lang)]
        : [documentFieldLine(label, amount, lang)],
    ),
    totalLine(cartTotalAmount(input), undefined, lang),
  ];
}
