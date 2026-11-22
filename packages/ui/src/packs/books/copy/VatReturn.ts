import { z } from "zod";
import * as c from "../../../catalog";
import { booksWordsFor } from "../lang";
import { distinct, periodFields, ref } from "../seeds";

const boxCount = 9;
type Period = { from: string; to: string; schemeRef: string };
type Input = Period & { ledgerGoto?: string | undefined; style?: string; boxes?: VatBox[] };
const rate = z.number().min(0).max(1);
const entry = z.object({
  sourceRef: ref,
  category: c.text(24),
  date: c.isoDate,
  kind: z.enum(["sale", "purchase", "excluded"]),
  netMinor: z.int(),
  vatCode: ref.optional(),
  businessUse: rate.default(1),
  recovery: rate.default(1),
});
const snapshot = z.object({
  ...periodFields,
  schemeRef: ref,
  scheme: z.literal("domestic_cash"),
  version: ref,
  currency: c.appCurrencySchema,
  rates: z.record(ref, rate),
  reconciled: z.literal(true),
  saved: z.boolean().default(false),
  entries: z.array(entry),
});
type Snapshot = z.output<typeof snapshot>;
type Entry = z.output<typeof entry>;

export const vatBox = z.object({
  number: z.int().min(1).max(boxCount),
  minor: z.int(),
  sources: z.array(z.string()),
  exclusions: z.array(z.string()),
  goto: c.screenId.optional(),
  linked: z.boolean(),
});
export type VatBox = z.output<typeof vatBox>;

function forPeriod(input: Period, data?: c.DeviceData) {
  const matches = data?.books_vat_snapshots?.filter((row) => {
    const value = row as Partial<Period> | null;
    return value?.from === input.from && value.to === input.to && value.schemeRef === input.schemeRef;
  });
  return matches?.length === 1 ? snapshot.safeParse(matches[0]).data : undefined;
}

function reconcile(input: Input, data?: c.DeviceData) {
  const snap = forPeriod(input, data);
  if (!snap || !distinct(snap.entries, ({ sourceRef }) => sourceRef)) return;
  const amounts = figures(input, snap);
  return amounts && { snap, rows: amounts };
}

function figures(input: Input, snap: Snapshot): VatBox[] | undefined {
  const purchases = new Set([4, 5, 7]);
  const sales = new Set([1, 3, 5, 6]);
  const rows: VatBox[] = Array.from({ length: boxCount }, (_, i) => ({
    number: i + 1,
    minor: 0,
    sources: [],
    exclusions: [],
    linked: false,
  }));
  for (const line of snap.entries) {
    const { category, date, kind, netMinor, vatCode, businessUse, recovery } = line;
    if (date < input.from || date > input.to) return;
    const taxRate = vatCode === undefined ? 0 : snap.rates[vatCode];
    if (kind !== "excluded" && taxRate === undefined) return;
    const tax = minorRound(netMinor * (taxRate ?? 0));
    const reclaimed = minorRound(tax * businessUse * recovery);
    for (const box of rows) {
      if (kind === "excluded") {
        if (sales.has(box.number) || purchases.has(box.number)) add(box.exclusions, category);
      } else if (kind === "sale" ? sales.has(box.number) : purchases.has(box.number)) {
        add(box.sources, category);
        box.goto = input.ledgerGoto;
        box.linked = Boolean(input.ledgerGoto);
        box.minor += contribution(box.number, line, tax, reclaimed);
        if (businessUse < 1 || (purchases.has(box.number) && kind === "purchase" && recovery < 1))
          add(box.exclusions, category);
      }
    }
  }
  return rows.every(({ minor }) => Number.isSafeInteger(minor)) ? rows : undefined;
}

function add(items: string[], value: string) {
  if (!items.includes(value)) items.push(value);
}

function minorRound(value: number) {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function contribution(box: number, line: Entry, tax: number, reclaimed: number) {
  if (box === 6) return line.netMinor;
  if (box === 7) return minorRound(line.netMinor * line.businessUse);
  if (line.kind === "sale") return tax;
  return box === 5 ? -reclaimed : reclaimed;
}

export function vatRows(data: c.DeviceData, input: c.Values): VatBox[] {
  return reconcile(input as Input, data)?.rows ?? [];
}

export function validVatSnapshot(data: c.DeviceData, input: c.Values) {
  const result = reconcile(input as Input, data);
  return Boolean(result && !result.snap.saved);
}

export function vatPeriod({ from, to }: Period, lang?: string) {
  return { from: c.appointmentDate(from, lang), to: c.appointmentDate(to, lang) };
}

export function vatDisplay(input: Input, data: c.DeviceData | undefined, lang?: string) {
  const checked = reconcile(input, data);
  if (!checked) return;
  const { snap, rows } = checked;
  const words = booksWordsFor(lang).vatReturn;
  const money = (minor: number) =>
    c.moneyLine(minor / 10 ** c.moneyFractionDigits(snap.currency), snap.currency, undefined, lang);
  const net = rows[4]!.minor;
  return {
    saved: snap.saved,
    totalLabel: net < 0 ? words.refundable : net > 0 ? words.payable : words.settled,
    total: money(Math.abs(net)),
    box: ({ number, minor, sources, exclusions }: VatBox) => ({
      rank: c.numberLine(number, lang),
      label: words.boxes[number - 1]!,
      value: money(number === 5 ? Math.abs(minor) : minor),
      sources: input.style === "reconcile" ? words.sources(words.join(sources) || words.none) : undefined,
      exclusions:
        input.style === "reconcile" ? words.exclusions(words.join(exclusions) || words.none) : undefined,
    }),
  };
}

export function vatRead(input: unknown, state: c.StateName, lang?: string, data?: c.DeviceData) {
  if (state === "empty" || state === "loading") return [];
  const value = input as Input;
  const words = booksWordsFor(lang).vatReturn;
  const display = vatDisplay(value, data, lang);
  if (state === "error" || !display) return [words.errorTitle, words.errorDetail];
  const { from, to } = vatPeriod(value, lang);
  return [
    words.heading,
    words.dates(from, to),
    display.totalLabel,
    display.total,
    ...(state === "success" || display.saved ? [words.saved, words.local] : [words.save]),
    ...(value.boxes ?? []).flatMap((box) => {
      const line = display.box(box);
      return [
        words.reading(words.box(line.rank), line.label, line.value),
        line.sources,
        line.exclusions,
      ].filter((text): text is string => text !== undefined);
    }),
  ];
}

// Synthetic ledger for the worked examples.
export function previewVat({ input, state }: { input: c.Values; state: c.StateName }): c.DeviceData {
  const { from, to, schemeRef } = input as Period;
  const care = from === "2026-10-01";
  return {
    books_vat_snapshots: [
      {
        from,
        to,
        schemeRef,
        scheme: "domestic_cash",
        version: "cash_v1",
        currency: "GBP",
        rates: { standard: 0.2 },
        reconciled: true,
        saved: state === "success",
        entries: [
          {
            sourceRef: "sales",
            date: from,
            kind: "sale",
            category: care ? "Plant care" : "Dog walks",
            netMinor: care ? 468000 : 126000,
            vatCode: "standard",
          },
          {
            sourceRef: "supplies",
            date: to,
            kind: "purchase",
            category: care ? "Nursery supplies" : "Walking gear",
            netMinor: care ? 138000 : 160000,
            vatCode: "standard",
          },
          ...(!care
            ? [
                {
                  sourceRef: "drawings",
                  date: to,
                  kind: "excluded",
                  category: "Personal costs",
                  netMinor: 6200,
                },
              ]
            : []),
        ],
      },
    ],
  };
}
