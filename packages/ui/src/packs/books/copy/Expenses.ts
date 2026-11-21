import { z } from "zod";
import * as c from "../../../catalog";
import { booksWordsFor } from "../lang";
import { ref, dateTime } from "../seeds";

const recordRef = ref.meta({ kind: "ref" });
const fraction = z.number().min(0).max(1);
// prettier-ignore
const split = z.strictObject({
  title: c.text(32), net: z.number().positive(), businessUse: fraction, categoryRef: recordRef, vatCode: recordRef,
});
// prettier-ignore
export const expenseReceipt = z.strictObject({
  expenseRef: recordRef, date: c.isoDate, supplier: c.text(32), receipt: c.photo.optional(),
  lines: z.array(split).min(1).max(8), postedAt: dateTime.optional(), voided: z.boolean().default(false),
  goto: c.screenId.optional(),
}).refine(({ postedAt, voided }) => !voided || postedAt !== undefined, { path: ["voided"] });
type Receipt = z.output<typeof expenseReceipt>;
const choice = z.object({ value: recordRef, label: c.text(24) });
const choices = z
  .array(choice)
  .max(12)
  .refine((list) => new Set(list.map(({ value }) => value)).size === list.length);
const permission = z.object({
  expenseRef: recordRef,
  title: c.text(32),
  categories: choices,
  vatRates: choices,
});
// prettier-ignore
const receiptFields = { ...expenseReceipt.shape, linked: z.boolean(), hasPhoto: z.boolean(), canVoid: z.boolean() };
const splitFields = {
  ...split.shape,
  expenseRef: recordRef,
  editable: z.boolean(),
  businessPercent: z.number().min(0).max(100),
  categories: choices,
  vatRates: choices,
};
const projectedReceipt = z.object({ ...receiptFields, kind: z.literal("receipt") });
const projectedSplit = z.object({ ...splitFields, kind: z.literal("split") });
export const expenseRow = z
  .object({
    ...z.object(receiptFields).partial().shape,
    ...z.object(splitFields).partial().shape,
    kind: z.enum(["receipt", "split"]),
    expenseRef: recordRef,
  })
  .refine((row) => (row.kind === "receipt" ? projectedReceipt : projectedSplit).safeParse(row).success);
export type ReceiptRow = z.output<typeof projectedReceipt> & { id: string };
export type SplitRow = z.output<typeof projectedSplit> & { id: string };
export type ExpenseRow = ReceiptRow | SplitRow;
type Input = { receipts: Receipt[]; style: string; detail?: string; rows?: ExpenseRow[] };

// These are also the scaffold's numeric rows; the projected replacement preserves their addresses.
export function expenseRows(data: c.DeviceData, input: c.Values) {
  const { receipts, style } = input as Input;
  const receiptRows = receipts.map((row) => ({
    ...row,
    kind: "receipt" as const,
    linked: Boolean(row.goto),
    hasPhoto: Boolean(row.receipt),
    canVoid: Boolean(row.postedAt && !row.voided),
  }));
  const first = receipts[0];
  if (style !== "receipt" || !first) return receiptRows;
  const allowed = (data.books_expense_choices ?? []).flatMap((raw) => {
    const result = permission.safeParse(raw);
    return result.success ? [result.data] : [];
  });
  return [
    ...receiptRows,
    ...first.lines.map((line) => {
      const matches = allowed.filter(
        (item) => item.expenseRef === first.expenseRef && item.title === line.title,
      );
      const access =
        first.lines.filter(({ title }) => title === line.title).length === 1 && matches.length === 1
          ? matches[0]
          : undefined;
      return {
        ...line,
        businessPercent: line.businessUse * 100,
        kind: "split" as const,
        expenseRef: first.expenseRef,
        editable: !first.postedAt,
        categories: access?.categories ?? [],
        vatRates: access?.vatRates ?? [],
      };
    }),
  ];
}

export function expenseEditPath(row: c.Values, wire: c.Values) {
  if (row.kind !== "split" || !Array.isArray(wire.receipts)) return;
  const index = wire.receipts.findIndex((item: Receipt) => item.expenseRef === row.expenseRef);
  const owner = wire.receipts[index] as Receipt | undefined;
  if (!owner || owner.postedAt || owner.lines.filter(({ title }) => title === row.title).length !== 1) return;
  return ["receipts", index, "lines", owner.lines.findIndex(({ title }) => title === row.title)];
}

const rules = z.object({
  currency: c.appCurrencySchema,
  vatRates: z.record(recordRef, z.object({ rate: fraction, recovery: fraction })),
  categories: z.record(recordRef, fraction),
});
type Rule = z.output<typeof rules>;
type Line = z.output<typeof split>;

export function expenseNet(net: number, data?: c.DeviceData, lang?: string) {
  const currency = c.appCurrencySchema.safeParse((data?.books_expense_rules?.[0] as Partial<Rule>)?.currency);
  return currency.success
    ? c.moneyLine(net, currency.data, undefined, lang, "fixed")
    : c.numberLine(net, lang);
}

function calculation(line: Line & { businessPercent?: number }, rule: Rule, scale: number) {
  const vat = rule.vatRates[line.vatCode],
    allowed = rule.categories[line.categoryRef];
  if (!vat || allowed === undefined) return;
  const net = Math.round((line.net + Number.EPSILON) * scale),
    tax = Math.round(net * vat.rate);
  const gross = net + tax;
  const share = line.businessPercent === undefined ? line.businessUse : line.businessPercent / 100;
  const recovered = Math.round(tax * share * vat.recovery);
  const businessCost = Math.round(gross * share) - recovered;
  return { gross, deduct: Math.round(businessCost * allowed), recovered };
}

export function expenseDisplay(receipt: Receipt, lines: readonly Line[], data?: c.DeviceData, lang?: string) {
  const rule =
    data?.books_expense_rules?.length === 1 ? rules.safeParse(data.books_expense_rules[0]).data : undefined;
  if (!rule) return;
  const scale = 10 ** c.moneyFractionDigits(rule.currency);
  const amounts = { gross: 0, deduct: 0, recovered: 0 };
  for (const line of lines) {
    const figures = calculation(line, rule, scale);
    if (!figures) return;
    for (const key of Object.keys(amounts) as (keyof typeof amounts)[]) amounts[key] += figures[key];
    if (!Object.values(amounts).every(Number.isSafeInteger)) return;
  }
  const money = (value: number) => c.moneyLine(value / scale, rule.currency, undefined, lang);
  // A void keeps its original receipt and split figures visible as evidence.
  return {
    gross: money(amounts.gross),
    cost: money(amounts.deduct),
    vat: money(amounts.recovered),
    voided: receipt.voided,
  };
}

// prettier-ignore
export function expenseRead(input: unknown, state: c.StateName, lang?: string, data?: c.DeviceData) {
  if (state === "empty" || state === "loading") return [];
  const { rows = [], detail, style, captureGoto, canPost } = input as Input & { captureGoto?: string; canPost?: boolean };
  const { expenses: w, ledger: { refLabel } } = booksWordsFor(lang);
  if (state === "error") return [w.errorTitle, w.errorDetail];
  return [style === "receipt" ? w.receipt : w.register, ...rows.flatMap((row) => {
    if (row.kind === "split") {
      const labels = (options: SplitRow["categories"], value: string) =>
        row.editable && state === "filled" && options.length ? options.map(({ label }) => label) :
          [options.find((item) => item.value === value)?.label ?? refLabel(value, lang)];
      const share = c.percentageLine(row.businessPercent, lang), editing = row.editable && state === "filled";
      return [w.item(row.id, [row.title, c.numberLine(row.net, lang), w.businessRead(c.numberLine(row.businessPercent / 100, lang))]),
        w.net, editing ? w.share : w.business, share, ...(editing ? [] : [expenseNet(row.net, data, lang)]),
        w.category, ...labels(row.categories, row.categoryRef), w.vatCode, ...labels(row.vatRates, row.vatCode)];
    }
    const status = row.voided ? w.voided : row.postedAt ? w.posted : state === "success" ? w.saved : w.draft;
    const splits = rows.filter((item): item is SplitRow => item.kind === "split" && item.expenseRef === row.expenseRef);
    const values = expenseDisplay(row, splits.length ? splits : row.lines, data, lang);
    const title = w.item(row.id, [row.supplier, c.appointmentDate(row.date, lang), status]);
    return [title, ...(!values ? [w.unavailable] : [w.field(w.gross, values.gross),
      ...(detail !== "brief" ? [w.field(w.cost, values.cost), w.field(w.vat, values.vat)] : [])]),
      ...(row.hasPhoto ? [w.evidence] : []), ...(row.canVoid ? [w.void] : [])];
  }), ...(canPost && state === "filled" ? [w.post] : []), ...(captureGoto ? [w.capture] : [])];
}

// Synthetic rules and split permissions for the worked examples.
// prettier-ignore
export function previewExpenses({ input }: { input: c.Values }): c.DeviceData {
  const { receipts } = input as Input;
  const categories = [{ value: "supplies", label: "Supplies" }, { value: "travel", label: "Travel" }];
  const vatRates = [{ value: "standard", label: "Standard" }, { value: "none", label: "No VAT" }];
  return {
    books_expense_rules: [{ currency: "GBP", categories: { supplies: 1, travel: 0.8 },
      vatRates: { standard: { rate: 0.2, recovery: 1 }, none: { rate: 0, recovery: 0 } } }],
    books_expense_choices: receipts.flatMap(({ expenseRef, lines }) =>
      lines.map(({ title }) => ({ expenseRef, title, categories, vatRates }))),
  };
}
