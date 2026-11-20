import { z } from "zod";
import * as c from "../../../catalog";
import { distinct, periodFields, ref, seedPeriod, seedTitle, validPeriod } from "../seeds";

// Core first: Timeline/history cannot classify numeric cash movements, pair transfers or reconcile sources.
export const meta = {
  id: "Ledger",
  status: "draft",
  group: "data",
  purpose: "Review classified business cash movements and open the receipts or payments behind them.",
  pick: "A business's dated cash book with amounts in and out, account and category references, linked source records or transfer pairs. Not a plain dated history (Timeline), personal spending (Transactions), one client's activity (ClientHistory), or arbitrary records (Table).",
  writeHints: [
    "Write positive net amounts, direction and snake_case references. Do not write VAT amounts, gross, totals or running balances.",
    "A visible transfer pair uses the same transferRef, opposite directions, equal net, distinct accounts and no vatCode. A counterpart outside this seed may resolve from the host ledger.",
    'Periods are ordered and at most 366 days inclusive. Use group "sections" only when grouped by account is requested; otherwise leave it null.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A local ledger uses stored receipts and cash records; file export uses the phone's share sheet.",
  variants: { density: ["comfortable", "compact"], group: ["none", "sections"] },
  variantParts: { "group.sections": { adds: ["account_heading"] } },
  parts: ["root", "from", "to", "total_in", "total_out", "export", "account_heading"],
  items: {
    key: "entries",
    parts: ["root", "date", "payee", "account", "category", "source", "net", "vat", "gross", "balance"],
  },
  partTiers: { export: "service" },
  states: ["filled", "empty", "loading", "error"],
  actions: {
    parts: { export: ["press"] },
    items: { root: ["press"] },
    when: { root: { linked: true } },
  },
  read: (input, _state, lang): string[] =>
    (input as z.output<typeof props>).entries.map(
      ({ date, direction, net }, index) => `r${index + 1}: ${date} · ${direction} ${c.numberLine(net, lang)}`,
    ),
} as const satisfies c.Meta;

const entry = z.strictObject({
  entryRef: ref,
  date: c.isoDate,
  payee: c.text(32),
  accountRef: ref,
  categoryRef: ref,
  direction: z.enum(["in", "out"]),
  net: z.number().positive(),
  vatCode: ref.optional(),
  sourceRef: ref.optional(),
  transferRef: ref.optional(),
  goto: c.screenId.optional(),
});

function validTransfers(entries: readonly z.output<typeof entry>[]) {
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

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    ...periodFields,
    entries: z.array(entry).min(1).max(24),
  })
  .refine(validPeriod, { path: ["to"], message: "Use an ordered period of at most 366 days" })
  .refine(
    ({ from, to, entries }) =>
      distinct(entries, ({ entryRef }) => entryRef) &&
      entries.every(({ date }) => from <= date && date <= to) &&
      validTransfers(entries),
    { path: ["entries"], message: "Use unique entries in the period and matching transfer legs" },
  )
  .overwrite((input) => ({
    ...input,
    entries: input.entries.map((row) => ({ ...row, linked: row.goto !== undefined })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    ...seedPeriod,
    entries: [
      {
        entryRef: "item_1",
        date: seedPeriod.from,
        payee: seedTitle(input, 32),
        accountRef: "item_2",
        categoryRef: "item_3",
        direction: "in",
        net: 1,
      },
    ],
  };
}

// prettier-ignore
export const examples = [
  { from: "2026-11-01", to: "2026-11-30", entries: [
    { entryRef: "fern_visit", date: "2026-11-12", payee: "Fern care visit", accountRef: "cash", categoryRef: "services",
      direction: "in", net: 150, vatCode: "standard", sourceRef: "visit_receipt", goto: "visit_receipt" },
  ] },
  { from: "2026-11-01", to: "2026-11-30", density: "compact", group: "sections", entries: [
    { entryRef: "reserve_out", date: "2026-11-20", payee: "Tax reserve", accountRef: "cash", categoryRef: "transfer",
      direction: "out", net: 40, transferRef: "reserve_move" },
    { entryRef: "reserve_in", date: "2026-11-20", payee: "Tax reserve", accountRef: "reserve", categoryRef: "transfer",
      direction: "in", net: 40, transferRef: "reserve_move" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Ledger");
const cashBrief =
  "November 2026 business books: on November 12 a Fern care visit paid in 150 net to cash, category services, entry fern_visit, standard VAT.";
export const probes = [
  choose(
    "Show our business cash in and cash out, classified by account and category, and let me open the payment or receipt behind each entry.",
  ),
  choose(
    "Show the last three watering events on their dates in a short chronological history, with no money or accounts.",
    "Timeline",
  ),
  write(cashBrief),
  {
    ...write(`${cashBrief} Group the ledger entries under account headings.`),
    variant: { axis: "group", value: "sections" },
  },
  read("Open the source for the Fern care visit.", { address: "l1/r1", action: "press" }),
  read("Export the ledger file.", { address: "l1/export", action: "press" }),
] satisfies c.Probe[];
