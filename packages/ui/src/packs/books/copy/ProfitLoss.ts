import { z } from "zod";
import * as c from "../../../catalog";
import { booksWordsFor } from "../lang";
import { distinct, ref } from "../seeds";

const maxCategories = 12;
const ratio = z.number().min(0).max(1);
const classification = z.enum(["income", "expense", "capital", "drawings", "transfer"]);
const category = z.object({
  slot: z.int().min(1).max(maxCategories),
  ref,
  label: c.text(24),
  kind: classification,
  allowable: ratio.default(1),
});
const rules = z.object({
  basis: z.literal("cash"),
  version: ref,
  currency: c.appCurrencySchema,
  vatRates: z.record(ref, ratio),
  categories: z.array(category).max(maxCategories),
});
// prettier-ignore
const entries = z.array(z.object({
  entryRef: ref,
  date: c.isoDate,
  direction: z.enum(["in", "out"]),
  categoryRef: ref,
  net: z.number().positive(),
  vatCode: ref.optional(),
  businessUse: ratio.default(1),
  recovery: ratio.default(1),
  transferRef: ref.optional(),
}));
type Cash = z.output<typeof entries>[number];
type Rules = z.output<typeof rules>;
// prettier-ignore
type Input = {
  from: string; to: string; compareFrom?: string | undefined; compareTo?: string | undefined;
  ledgerGoto?: string | undefined; detail?: string | undefined; style?: string; categories?: ProfitRow[];
};
// prettier-ignore
export const profitRow = z.object({
  label: c.text(24).optional(), categoryRef: ref.meta({ kind: "ref" }).optional(), kind: classification.optional(),
  current: z.int(), previous: z.int(), active: z.boolean(), linked: z.boolean(), goto: c.screenId.optional(),
});
export type ProfitRow = z.output<typeof profitRow>;
type Totals = { income: number; expense: number; addBack: number };
const emptyTotals = (): Totals => ({ income: 0, expense: 0, addBack: 0 });

function cashMinor(line: Cash, kind: "income" | "expense", config: Rules, scale: number) {
  const rate = line.vatCode ? config.vatRates[line.vatCode] : 0;
  if (rate === undefined) return;
  const net = Math.round((line.net + Number.EPSILON) * scale);
  const vat = Math.round(net * rate);
  if (kind === "income") return line.direction === "in" ? net : -net;
  const business =
    Math.round((net + vat) * line.businessUse) - Math.round(vat * line.businessUse * line.recovery);
  return line.direction === "out" ? business : -business;
}

function periodTotals(config: Rules, cash: Cash[], from: string, to: string, scale: number) {
  const lookup = new Map(config.categories.map((item) => [item.ref, item]));
  const result = { totals: emptyTotals(), bySlot: new Map<number, number>() };
  for (const line of cash) {
    if (line.date < from || line.date > to || line.transferRef) continue;
    const item = lookup.get(line.categoryRef);
    if (!item) return;
    const { slot, kind, allowable } = item;
    if (kind !== "income" && kind !== "expense") continue;
    const minor = cashMinor(line, kind, config, scale);
    if (minor === undefined || !Number.isSafeInteger(minor)) return;
    result.bySlot.set(slot, (result.bySlot.get(slot) ?? 0) + minor);
    result.totals[kind] += minor;
    if (kind === "expense")
      result.totals.addBack += Math.sign(minor) * Math.round(Math.abs(minor) * (1 - allowable));
  }
  const { totals } = result;
  const profit = totals.income - totals.expense;
  return [...result.bySlot.values(), ...Object.values(totals), profit, profit + totals.addBack].every(
    Number.isSafeInteger,
  )
    ? result
    : undefined;
}

function report(input: Input, data?: c.DeviceData) {
  const config =
    data?.books_profit_rules?.length === 1 ? rules.safeParse(data.books_profit_rules[0]).data : undefined;
  const cash = entries.safeParse(data?.books_ledger_entries).data;
  if (!config || !cash || !distinct(cash, ({ entryRef }) => entryRef)) return;
  if (
    !distinct(config.categories, ({ ref }) => ref) ||
    !distinct(config.categories, ({ slot }) => String(slot))
  )
    return;
  const scale = 10 ** c.moneyFractionDigits(config.currency);
  const current = periodTotals(config, cash, input.from, input.to, scale);
  const comparison = input.compareFrom !== undefined && input.compareTo !== undefined;
  const previous = comparison
    ? periodTotals(config, cash, input.compareFrom!, input.compareTo!, scale)
    : undefined;
  if (!current || (comparison && !previous)) return;
  return { config, scale, current, previous };
}

// prettier-ignore
export function profitRows(data: c.DeviceData, input: c.Values): ProfitRow[] {
  const value = input as Input;
  const summary = report(value, data);
  if (!summary) return [];
  const { config, current, previous } = summary;
  const categories = new Map(config.categories.map((item) => [item.slot, item]));
  return Array.from({ length: maxCategories }, (_, index) => {
    const slot = index + 1, item = categories.get(slot);
    const active = current.bySlot.has(slot) || (previous?.bySlot.has(slot) ?? false);
    const goto = active && current.bySlot.has(slot) ? value.ledgerGoto : undefined;
    return { label: item?.label, categoryRef: item?.ref, kind: item?.kind, active, goto,
      current: current.bySlot.get(slot) ?? 0, previous: previous?.bySlot.get(slot) ?? 0, linked: Boolean(goto) };
  });
}

export function profitDates(input: Input, lang?: string) {
  const { from, to, compareFrom, compareTo } = input;
  const words = booksWordsFor(lang).profitLoss;
  const date = (value: string) => c.appointmentDate(value, lang);
  return {
    from: date(from),
    to: date(to),
    comparison: compareFrom && compareTo ? words.comparison(date(compareFrom), date(compareTo)) : undefined,
  };
}

// prettier-ignore
export function profitDisplay(input: Input, data?: c.DeviceData, lang?: string) {
  const summary = report(input, data);
  if (!summary) return;
  const { config, scale, current, previous } = summary, { income, expense, addBack } = current.totals;
  const words = booksWordsFor(lang).profitLoss;
  const profit = income - expense;
  const money = (minor: number) => c.moneyLine(minor / scale, config.currency, undefined, lang);
  const change = (minor: number) => words.change(c.changeLine(minor / scale, "money", config.currency, lang));
  return {
    amounts: { income: money(income), costs: money(expense), profit: money(profit),
      disallowed_costs: money(addBack), taxable_profit: money(profit + addBack) },
    profitLabel: profit < 0 ? words.loss : words.profit,
    profitChange: previous && change(profit - (previous.totals.income - previous.totals.expense)),
    empty: current.bySlot.size === 0 && (!previous || previous.bySlot.size === 0),
    row: (item: ProfitRow) => ({ subtotal: money(item.current),
      change: previous && input.detail !== "brief" ? change(item.current - item.previous) : undefined }),
  };
}

// prettier-ignore
export function profitRead(input: unknown, state: c.StateName, lang?: string, data?: c.DeviceData) {
  if (state === "empty" || state === "loading") return [];
  const value = input as Input, w = booksWordsFor(lang).profitLoss;
  const display = profitDisplay(value, data, lang), dates = profitDates(value, lang);
  if (!display || state === "error") return [w.errorTitle, w.errorDetail];
  if (display.empty) return [];
  const { amounts: a, profitLabel, profitChange } = display;
  return [
    w.heading, w.dates(dates.from, dates.to), dates.comparison, w.field(profitLabel, a.profit), profitChange,
    w.field(w.income, a.income), w.field(w.expense, a.costs),
    ...(value.style === "tax_bridge" ? [w.field(w.addBack, a.disallowed_costs), w.field(w.taxable, a.taxable_profit)] : []),
    ...(value.categories ?? []).flatMap((item) => {
      const row = display.row(item);
      return [item.label && w.field(item.label, row.subtotal), row.change];
    }),
  ].filter((line): line is string => line !== undefined);
}

// Synthetic ledger for the worked examples.
// prettier-ignore
export function previewProfit({ input }: { input: c.Values }): c.DeviceData {
  const { from, compareFrom } = input as Input;
  const walk = compareFrom !== undefined;
  const line = (entryRef: string, date: string, direction: "in" | "out", categoryRef: string, net: number) =>
    ({ entryRef, date, direction, categoryRef, net, vatCode: "standard" });
  return {
    books_profit_rules: [{ basis: "cash", version: "cash_v1", currency: "GBP", vatRates: { standard: 0.2 }, categories: [
      { slot: 1, ref: "services", label: walk ? "Dog walks" : "Plant visits", kind: "income" },
      { slot: 2, ref: "other", label: walk ? "Pet sitting" : "Repotting", kind: "income" },
      { slot: 3, ref: "supplies", label: walk ? "Walking gear" : "Nursery supplies", kind: "expense" },
      { slot: 4, ref: "travel", label: "Travel", kind: "expense", allowable: 0.7 },
    ] }],
    books_ledger_entries: [
      line("services", from, "in", "services", walk ? 2970 : 2340),
      line("other", from, "in", "other", walk ? 525 : 360),
      line("supplies", from, "out", "supplies", 540),
      line("travel", from, "out", "travel", 350),
      ...(compareFrom ? [
        line("past_services", compareFrom, "in", "services", 2750),
        line("past_other", compareFrom, "in", "other", 420),
        line("past_supplies", compareFrom, "out", "supplies", 498),
        line("past_travel", compareFrom, "out", "travel", 375),
      ] : []),
    ],
  };
}
