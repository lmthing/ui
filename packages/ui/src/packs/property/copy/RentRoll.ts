import { appointmentDate, compactMoneyLine, dateLocaleOf, moneyLine } from "../../../catalog";
import type { ledgerRows } from "../ledger";
import { propertyWordsFor } from "../lang";

type Charge = {
  chargeRef: string;
  unitRef: string;
  unit: string;
  occupant: string;
  due: string;
  amount: number;
};
type Receipt = {
  chargeRef: string;
  date: string;
  amount: number;
  method: "cash" | "transfer" | "card";
  voided: boolean;
};
type Reconciled = ReturnType<typeof ledgerRows<Charge, Receipt>>;
type LedgerLine = Reconciled["lines"][number];
type ChargeLine = Extract<LedgerLine, { kind: "charge" }>;
type ReceiptLine = Extract<LedgerLine, { kind: "receipt" }>;
type Figures = "short" | "exact";
type Money = (value: number) => string;

export function autopayLabel(autopay: boolean | undefined, lang?: string) {
  return autopay === undefined ? undefined : propertyWordsFor(lang).rentRoll.autopay[autopay ? "on" : "off"];
}

export function rentCopy(figures: Figures, lang?: string) {
  const words = propertyWordsFor(lang).rentRoll;
  const money: Money = (value) =>
    figures === "short"
      ? compactMoneyLine(value, undefined, lang)
      : moneyLine(value, undefined, undefined, lang);
  const summaryParts = ["assessed", "received", "outstanding", "arrears"] as const;
  return {
    month: (month: string) =>
      new Intl.DateTimeFormat(dateLocaleOf(lang), {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${month}-01T00:00:00Z`)),
    summary: (totals: Reconciled["totals"]) =>
      summaryParts.map((part) => ({ part, label: words[part], value: money(totals[part]) })),
    charge: (line: ChargeLine) => chargeCopy(line, money, lang),
    receipt: (line: ReceiptLine) => ({
      date: appointmentDate(line.date, lang),
      method: words.method[line.method],
      value: money(line.amount),
    }),
  };
}

function chargeCopy(line: ChargeLine, money: Money, lang?: string) {
  const words = propertyWordsFor(lang).rentRoll;
  const parts = ["amount", "paid", "outstanding", "credit"] as const;
  return {
    due: words.due(appointmentDate(line.due, lang)),
    fields: parts.flatMap((part) =>
      part === "credit" && !line.credit ? [] : [{ part, label: words[part], value: money(line[part]) }],
    ),
  };
}

/** Group visible receipts under their charge without deriving a new item id or changing row order. */
export function rentGroups<T extends LedgerLine>(lines: readonly T[]) {
  const byCharge = new Map<string, Extract<T, { kind: "receipt" }>[]>();
  for (const line of lines) {
    if (!line.visible || line.kind !== "receipt") continue;
    const receipts = byCharge.get(line.chargeRef) ?? [];
    receipts.push(line as Extract<T, { kind: "receipt" }>);
    byCharge.set(line.chargeRef, receipts);
  }
  return lines.flatMap((line) =>
    line.visible && line.kind === "charge"
      ? [{ charge: line as Extract<T, { kind: "charge" }>, receipts: byCharge.get(line.chargeRef) ?? [] }]
      : [],
  );
}

type ReadInput = Omit<Reconciled, "lines"> & {
  figures: Figures;
  style: "ledger" | "outstanding" | "tenant";
  autopay?: boolean;
  lines: (LedgerLine & { id: string })[];
};

export function rentReading(input: unknown, state: string, lang?: string): string[] {
  const words = propertyWordsFor(lang).rentRoll;
  if (state !== "filled") return state === "success" ? [words.success] : [];
  const { figures, lines, totals, style, autopay } = input as ReadInput;
  const tenant = style === "tenant";
  const autopayStatus = tenant ? autopayLabel(autopay, lang) : undefined;
  const copy = rentCopy(figures, lang);
  const groups = rentGroups(lines);
  const summary = copy.summary(totals);
  return [
    ...(tenant ? [words.tenant] : []),
    ...(autopayStatus ? [autopayStatus] : []),
    words.summaryReading(
      copy.month(totals.month),
      summary.map(({ label, value }) => words.metricReading(label, value)),
    ),
    ...summary.map(({ label }) => label),
    ...(!groups.length ? [words.noCharges] : []),
    ...groups.flatMap(({ charge, receipts }) => [
      chargeReading(charge, copy, tenant, lang),
      ...(receipts.length ? [words.receipts] : []),
      ...receipts.map((line) => {
        const { date, method, value } = copy.receipt(line);
        return words.rowReading(line.id, [
          line.unit,
          date,
          method,
          value,
          ...(line.voided ? [words.voided] : tenant ? [] : [words.void]),
        ]);
      }),
    ]),
  ];
}

function chargeReading(
  line: ChargeLine & { id: string },
  copy: ReturnType<typeof rentCopy>,
  tenant: boolean,
  lang?: string,
) {
  const words = propertyWordsFor(lang).rentRoll;
  const { due, fields } = copy.charge(line);
  return words.rowReading(line.id, [
    line.unit,
    line.occupant,
    due,
    ...fields.map(({ label, value }) => words.metricReading(label, value, true)),
    ...(tenant ? (line.unpaid ? [words.pay] : []) : [words.record, ...(line.unpaid ? [words.remind] : [])]),
  ]);
}
