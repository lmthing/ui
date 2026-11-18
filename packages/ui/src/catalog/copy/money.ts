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

/** Shared document copy for bills and estimates. */
export const documentLabels = {
  invoice: "Invoice",
  quote: "Quote",
  to: "To",
  date: "Issued",
  due: "Due",
  subtotal: "Subtotal",
  tax: "Tax",
  total: moneyLabels.total,
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  send: "Send",
  accept: "Accept",
  decline: "Decline",
} as const;
type DocumentInput = {
  number: string;
  to: string;
  date: string;
  due?: string | undefined;
  lines: readonly { item: string; qty: number; price: number }[];
  tax?: number | undefined;
  status: "draft" | "sent" | "paid";
  style: "invoice" | "quote";
  note?: string | undefined;
};

/** Round each extended line and the tax to cents before adding the payable total. */
export function documentTotals(input: Pick<DocumentInput, "lines" | "tax">) {
  const subtotalCents = input.lines.reduce(
    (sum, line) => sum + Math.round((line.qty * line.price + Number.EPSILON) * 100),
    0,
  );
  const taxCents = Math.round((subtotalCents * (input.tax ?? 0)) / 100);
  return { subtotal: subtotalCents / 100, tax: taxCents / 100, total: (subtotalCents + taxCents) / 100 };
}

export function documentStatus(
  input: Pick<DocumentInput, "status" | "style" | "due">,
  state: string,
  now = new Date(),
): string {
  if (input.status === "paid") return documentLabels.paid;
  const status = state === "success" ? "sent" : input.status;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return input.style === "invoice" && status === "sent" && input.due && input.due < today
    ? documentLabels.overdue
    : documentLabels[status];
}

export const documentHeading = (style: DocumentInput["style"], number: string): string =>
  `${documentLabels[style]} ${number}`;
export const quantityLine = (qty: number): string => `Qty ${qty}`;
export const documentFieldLine = (label: string, value: string): string => `${label} · ${value}`;

export function documentFields(input: Pick<DocumentInput, "to" | "date" | "due">) {
  const parts = ["to", "date", "due"] as const;
  return parts.flatMap((part) =>
    input[part] ? [{ part, text: documentFieldLine(documentLabels[part], input[part]) }] : [],
  );
}

/** Ordered label/value pairs keep the visible totals and agent reading identical. */
export function documentAmounts(input: Pick<DocumentInput, "lines" | "tax">) {
  const totals = documentTotals(input);
  return [
    { part: "subtotal", label: documentLabels.subtotal, value: moneyLine(totals.subtotal) },
    ...(input.tax === undefined
      ? []
      : [{ part: "tax", label: `${documentLabels.tax} (${input.tax}%)`, value: moneyLine(totals.tax) }]),
    { part: "total", label: documentLabels.total, value: moneyLine(totals.total) },
  ];
}

export function documentReading(input: DocumentInput, state: string): string[] {
  return [
    documentHeading(input.style, input.number),
    documentStatus(input, state),
    ...documentFields(input).map(({ text }) => text),
    ...input.lines.flatMap((line) => [quantityLine(line.qty), moneyLine(line.price, undefined, "each")]),
    ...documentAmounts(input).flatMap(({ label, value }) => [label, value]),
    documentLabels.send,
    ...(input.style === "quote" ? [documentLabels.accept, documentLabels.decline] : []),
  ];
}
