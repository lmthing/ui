import { documentCopy, documentTotals, moneyLine, quantityLine, wordsFor } from "../../../catalog";
import { customersWordsFor } from "../lang";

type Invoice = Omit<Parameters<typeof documentCopy>[0], "number" | "style"> & {
  number?: string | undefined;
  style: "invoice" | "quote" | "estimate";
  deposit?: number | undefined;
  recurring?: "none" | "weekly" | "monthly" | "quarterly" | undefined;
  download?: boolean | undefined;
};

type Amount = { part: string; label: string; value: string };
const money = (value: number, lang?: string) => moneyLine(value, undefined, undefined, lang);

function invoiceAmounts(input: Invoice, amounts: Amount[], lang?: string): Amount[] {
  const w = customersWordsFor(lang).invoiceLabels;
  const discount = input.discount;
  const deposit = input.deposit;
  const result = amounts.flatMap((row) =>
    row.part === "subtotal" && discount !== undefined
      ? [row, { part: "discount", label: w.discount, value: money(discount, lang) }]
      : [row],
  );
  if (deposit === undefined) return result;
  const { total } = documentTotals(input);
  return [
    ...result,
    { part: "deposit", label: w.deposit, value: money(deposit, lang) },
    { part: "balance", label: w.balance, value: money(Math.max(0, total - deposit), lang) },
  ];
}

export function invoiceCopy(input: Invoice, state: string, lang?: string) {
  const w = customersWordsFor(lang).invoiceLabels;
  const { number, recurring, style } = input;
  const base = documentCopy(
    { ...input, number: number ?? "", style: style === "estimate" ? "quote" : style },
    state,
    lang,
  );
  return {
    ...base,
    heading:
      style === "estimate"
        ? number
          ? wordsFor(lang).documentHeading(w.estimate, number)
          : w.estimate
        : base.heading,
    headingPart: number ? "number" : "estimate",
    fields: [
      ...base.fields,
      ...(recurring && recurring !== "none" ? [{ part: "recurring", text: w.recurring[recurring] }] : []),
    ],
    amounts: invoiceAmounts(input, base.amounts, lang),
    download: input.download ? w.download : undefined,
  };
}

export function invoiceReading(input: Invoice, state: string, lang?: string): string[] {
  const copy = invoiceCopy(input, state, lang);
  const { documentLabels } = wordsFor(lang);
  return [
    copy.heading,
    copy.status,
    ...copy.fields.map(({ text }) => text),
    ...input.lines.flatMap((line) => [
      quantityLine(line.qty, lang),
      moneyLine(line.price, undefined, "each", lang),
    ]),
    ...copy.amounts.flatMap(({ label, value }) => [label, value]),
    copy.send.label,
    ...(input.style === "quote" ? [documentLabels.accept, documentLabels.decline] : []),
    ...(copy.download ? [copy.download] : []),
  ];
}
