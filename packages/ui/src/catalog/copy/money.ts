import { numberLine, percentageLine } from "../format";
import { localeOf, wordsFor, type Words } from "../lang";
import { moneyFractionDigits, type AppCurrency } from "../agent";

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
export type PerWord = keyof Words["perWords"] | "none";
export const defaultCurrency: Currency = "USD";

/** A sum of money, formatted for the currency. Whole sums drop the cents unless a column needs them. */
export function moneyLine(
  value: number,
  currency: AppCurrency = defaultCurrency,
  per: PerWord = "none",
  lang?: string,
  fraction: "auto" | "fixed" = "auto",
): string {
  const digits = moneyFractionDigits(currency);
  const amount = new Intl.NumberFormat(localeOf(lang), {
    style: "currency",
    currency,
    minimumFractionDigits: fraction === "fixed" || !Number.isInteger(value) ? digits : 0,
    maximumFractionDigits: digits,
  }).format(value);
  const words = wordsFor(lang);
  return per === "none" ? amount : words.perAmount(amount, words.perWords[per]);
}

/** A change with its direction: "+$32", "-€4.50", "+3.2%". */
export function changeLine(
  change: number,
  unit: "money" | "percent",
  currency: AppCurrency = defaultCurrency,
  lang?: string,
): string {
  const sign = change > 0 ? "+" : change < 0 ? "-" : "";
  const size = Math.abs(change);
  return unit === "percent"
    ? `${sign}${percentageLine(size, lang)}`
    : `${sign}${moneyLine(size, currency, undefined, lang)}`;
}

export const { moneyLabels, debtControlLabels, documentLabels } = wordsFor();

type DocumentInput = {
  number: string;
  to: string;
  date: string;
  due?: string | undefined;
  lines: readonly { item: string; qty: number; price: number }[];
  tax?: number | undefined;
  discount?: number | undefined;
  status: "draft" | "sent" | "paid";
  style: "invoice" | "quote";
  note?: string | undefined;
};

/** Round each line to cents; apply any discount before tax. */
export function documentTotals<Line extends { qty: number; price: number }>(input: {
  lines: readonly Line[];
  tax?: number | undefined;
  discount?: number | undefined;
}) {
  const subtotalCents = input.lines.reduce(
    (sum, line) => sum + Math.round((line.qty * line.price + Number.EPSILON) * 100),
    0,
  );
  const taxable = Math.max(0, subtotalCents - Math.round((input.discount ?? 0) * 100));
  const taxCents = Math.round((taxable * (input.tax ?? 0)) / 100);
  return { subtotal: subtotalCents / 100, tax: taxCents / 100, total: (taxable + taxCents) / 100 };
}

export function documentStatus(
  input: Pick<DocumentInput, "status" | "style" | "due">,
  state: string,
  now = new Date(),
  lang?: string,
): string {
  const { documentLabels } = wordsFor(lang);
  if (input.status === "paid") return documentLabels.paid;
  const status = state === "success" ? "sent" : input.status;
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const today = `${year}-${month}-${day}`;
  return input.style === "invoice" && status === "sent" && input.due && input.due < today
    ? documentLabels.overdue
    : documentLabels[status];
}

export const documentHeading = (style: DocumentInput["style"], number: string, lang?: string): string =>
  wordsFor(lang).documentHeading(wordsFor(lang).documentLabels[style], number);
export const quantityLine = (qty: number, lang?: string): string =>
  wordsFor(lang).quantity(numberLine(qty, lang));
export const documentFieldLine = (label: string, value: string, lang?: string): string =>
  wordsFor(lang).documentField(label, value);

/** Drafts lead with sending; a sent quote leads with the client's decision. */
export function documentSend(input: Pick<DocumentInput, "status" | "style">, state: string, lang?: string) {
  const { documentLabels } = wordsFor(lang);
  return {
    label: input.status === "draft" && state !== "success" ? documentLabels.send : documentLabels.resend,
    kind: input.style === "quote" && input.status === "sent" ? ("quiet" as const) : ("primary" as const),
  };
}

export function documentFields(input: Pick<DocumentInput, "to" | "date" | "due">, lang?: string) {
  const { documentLabels } = wordsFor(lang);
  const parts = ["to", "date", "due"] as const;
  return parts.flatMap((part) =>
    input[part] ? [{ part, text: documentFieldLine(documentLabels[part], input[part], lang) }] : [],
  );
}

export function documentCopy(input: DocumentInput, state: string, lang?: string) {
  return {
    heading: documentHeading(input.style, input.number, lang),
    status: documentStatus(input, state, undefined, lang),
    fields: documentFields(input, lang),
    amounts: documentAmounts(input, lang),
    send: documentSend(input, state, lang),
  };
}

/** Ordered label/value pairs keep the visible totals and agent reading identical. */
export function documentAmounts(input: Pick<DocumentInput, "lines" | "tax" | "discount">, lang?: string) {
  const words = wordsFor(lang);
  const { documentLabels } = words;
  const totals = documentTotals(input);
  return [
    {
      part: "subtotal",
      label: documentLabels.subtotal,
      value: moneyLine(totals.subtotal, undefined, undefined, lang),
    },
    ...(input.tax === undefined
      ? []
      : [
          {
            part: "tax",
            label: words.documentTax(documentLabels.tax, percentageLine(input.tax, lang)),
            value: moneyLine(totals.tax, undefined, undefined, lang),
          },
        ]),
    {
      part: "total",
      label: documentLabels.total,
      value: moneyLine(totals.total, undefined, undefined, lang),
    },
  ];
}

export function documentReading(input: DocumentInput, state: string, lang?: string): string[] {
  const { documentLabels } = wordsFor(lang);
  return [
    documentHeading(input.style, input.number, lang),
    documentStatus(input, state, undefined, lang),
    ...documentFields(input, lang).map(({ text }) => text),
    ...input.lines.flatMap((line) => [
      quantityLine(line.qty, lang),
      moneyLine(line.price, undefined, "each", lang),
    ]),
    ...documentAmounts(input, lang).flatMap(({ label, value }) => [label, value]),
    documentSend(input, state, lang).label,
    ...(input.style === "quote" ? [documentLabels.accept, documentLabels.decline] : []),
  ];
}

/** Keep record amounts readable even at the schema's largest finite magnitude. */
export function compactMoneyLine(
  value: number,
  currency: AppCurrency = defaultCurrency,
  lang?: string,
): string {
  const magnitude = Math.abs(value);
  if (magnitude < 10000) return moneyLine(value, currency, undefined, lang);
  return new Intl.NumberFormat(localeOf(lang), {
    style: "currency",
    currency,
    notation: magnitude < 1e15 ? "compact" : "scientific",
    maximumSignificantDigits: 3,
  }).format(value);
}
