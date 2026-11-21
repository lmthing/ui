import { z } from "zod";
import { appointmentDate, currencies, defaultCurrency, moneyLine, type DeviceData } from "../../../catalog";
import { booksWordsFor } from "../lang";

type CashEntry = {
  entryRef: string;
  date: string;
  payee: string;
  accountRef: string;
  categoryRef: string;
  direction: "in" | "out";
  net: number;
  vatCode?: string | undefined;
  sourceRef?: string | undefined;
  transferRef?: string | undefined;
};

const rules = z.object({
  currency: z.enum(currencies),
  vatRates: z.record(z.string(), z.number().min(0).max(1)),
  openingMinor: z.record(z.string(), z.number().int()),
});
type Rules = z.output<typeof rules>;
type LedgerInput<E extends CashEntry> = { from: string; to: string; entries: readonly E[]; group?: string };
const movements = z.array(
  z.object({
    entryRef: z.string(),
    date: z.iso.date(),
    accountRef: z.string(),
    direction: z.enum(["in", "out"]),
    net: z.number().positive(),
    vatCode: z.string().optional(),
  }),
);
type Movement = z.output<typeof movements>[number];

export function validTransfers(entries: readonly CashEntry[]) {
  return entries.every((row) => {
    if (!row.transferRef) return true;
    const peers = entries.filter((entry) => entry.transferRef === row.transferRef);
    const other = peers.find((entry) => entry !== row);
    return (
      !row.vatCode &&
      peers.length <= 2 &&
      (!other ||
        (other.accountRef !== row.accountRef && other.direction !== row.direction && other.net === row.net))
    );
  });
}

function ledgerAmounts(entries: readonly Movement[], config: Rules | undefined) {
  const currency = config?.currency ?? defaultCurrency;
  const currencyFormat = new Intl.NumberFormat(undefined, { style: "currency", currency });
  const scale = 10 ** currencyFormat.resolvedOptions().maximumFractionDigits!;
  const balances = new Map(Object.entries(config?.openingMinor ?? {}));
  const chronological = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const totals = { in: 0, out: 0 } as Record<CashEntry["direction"], number | undefined>;
  const lines = chronological.map((entry) => {
    const rate = entry.vatCode ? config?.vatRates[entry.vatCode] : 0;
    const net = Math.round((entry.net + Number.EPSILON) * scale);
    const vat = rate === undefined ? undefined : Math.round(net * rate + Number.EPSILON);
    const gross = vat === undefined ? undefined : net + vat;
    const subtotal = totals[entry.direction];
    totals[entry.direction] = subtotal === undefined || gross === undefined ? undefined : subtotal + gross;
    const previous = balances.get(entry.accountRef);
    const balance =
      previous === undefined || gross === undefined
        ? undefined
        : previous + (entry.direction === "in" ? gross : -gross);
    if (balance === undefined) balances.delete(entry.accountRef);
    else balances.set(entry.accountRef, balance);
    return [entry.entryRef, { net, vat, gross, balance }] as const;
  });
  return { currency, scale, totals, lines: new Map(lines) };
}

export function ledgerDisplay<E extends CashEntry>(
  input: LedgerInput<E>,
  data: DeviceData | undefined,
  lang?: string,
) {
  const words = booksWordsFor(lang).ledger;
  const { data: config } = rules.safeParse(data?.books_ledger_rules?.[0]);
  const { data: ledger } = movements.safeParse(data?.books_ledger_entries);
  const period = ledger?.filter(({ date }) => input.from <= date && date <= input.to);
  const { currency, scale, totals, lines } = ledgerAmounts(period ?? input.entries, config);
  const money = (minor: number | undefined) =>
    minor === undefined ? words.unavailable : moneyLine(minor / scale, currency, undefined, lang);
  const ref = (id: string) => words.refLabel(id, lang);
  const rows = [...input.entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => {
      const figure = lines.get(entry.entryRef);
      const gross = figure?.gross;
      return {
        entry,
        date: appointmentDate(entry.date, lang),
        accountName: ref(entry.accountRef),
        account: words.field(words.account, ref(entry.accountRef)),
        category: words.field(words.category, ref(entry.categoryRef)),
        source: entry.sourceRef ? words.field(words.source, ref(entry.sourceRef)) : undefined,
        transfer: entry.transferRef ? words.field(words.transfer, ref(entry.transferRef)) : undefined,
        net: words.field(words.net, money(figure?.net)),
        vat: words.field(words.vat, money(figure?.vat)),
        gross: money(gross === undefined ? gross : entry.direction === "out" ? -gross : gross),
        balance: words.field(words.balance, money(figure?.balance)),
      };
    });
  return {
    from: words.field(words.from, appointmentDate(input.from, lang)),
    to: words.field(words.to, appointmentDate(input.to, lang)),
    totalIn: money(totals.in),
    totalOut: money(totals.out),
    rows,
  };
}

export function ledgerRead<E extends CashEntry>(input: LedgerInput<E>, data?: DeviceData, lang?: string) {
  const words = booksWordsFor(lang).ledger;
  const { from, to, totalIn, totalOut, rows } = ledgerDisplay(input, data, lang);
  return [
    words.heading,
    from,
    to,
    words.field(words.in, totalIn),
    words.field(words.out, totalOut),
    words.export,
    ...rows.map(
      ({ entry, date, accountName, account, category, source, transfer, net, vat, gross, balance }) =>
        words.join(
          [
            entry.payee,
            date,
            account,
            category,
            source,
            transfer,
            entry.vatCode,
            net,
            vat,
            words.field(words[entry.direction], gross),
            balance,
            ...(input.group === "sections" ? [accountName] : []),
          ].filter((line): line is string => line !== undefined),
        ),
    ),
  ];
}
