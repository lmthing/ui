import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { ledgerDisplay, ledgerRead, validTransfers } from "../copy";
import { booksWordsFor } from "../lang";
import { distinct, periodFields, ref, seedPeriod, seedTitle, validPeriod } from "../seeds";
import { prompt } from "../../../entry/prompt-Ledger.generated";

// Core first: Timeline/history cannot classify numeric cash movements, pair transfers or reconcile sources.
export const meta = {
  id: "Ledger",
  status: "ready",
  group: "data",
  ...prompt,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A local ledger uses stored receipts and cash records; file export uses the phone's share sheet.",
  variants: { density: ["comfortable", "compact"], group: ["none", "sections"] },
  variantParts: { "group.sections": { adds: ["account_heading"] } },
  parts: ["root", "title", "sub", "from", "to", "total_in", "total_out", "export", "export_label"],
  items: {
    key: "entries",
    // prettier-ignore
    parts: ["root", "date", "payee", "account", "category", "source", "net", "vat", "gross", "balance", "account_heading", "transfer"],
  },
  partTiers: { export: "service" },
  states: ["filled", "empty", "loading", "error"],
  actions: {
    parts: { export: ["press"] },
    items: { root: ["press"] },
    when: { root: { linked: true } },
  },
  deviceData: ["books_ledger_rules", "books_ledger_entries"],
  previewDeviceData: () => ({
    books_ledger_rules: [
      { currency: "GBP", vatRates: { standard: 0.2 }, openingMinor: { cash: 45000, reserve: 15000 } },
    ],
  }),
  read: (input, state, lang, data): string[] =>
    state === "filled" ? ledgerRead(input as z.output<typeof props>, data, lang) : [],
} as const satisfies c.Meta;

const recordRef = ref.meta({ kind: "ref" });
const entry = z.strictObject({
  entryRef: recordRef,
  date: c.isoDate,
  payee: c.text(32),
  accountRef: recordRef,
  categoryRef: recordRef,
  direction: z.enum(["in", "out"]),
  net: z.number().positive(),
  vatCode: recordRef.optional(),
  sourceRef: recordRef.optional(),
  transferRef: recordRef.optional(),
  goto: c.screenId.optional(),
});

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

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    ...seedPeriod,
    entries: [{
      entryRef: "item_1", date: seedPeriod.from, payee: seedTitle(input, 32),
      accountRef: "item_2", categoryRef: "item_3", direction: "in", net: 1,
    }],
  };
}

// prettier-ignore
export const examples = [
  { from: "2026-11-01", to: "2026-11-30", entries: [
    { entryRef: "fern_visit", date: "2026-11-12", payee: "Fern care visit", accountRef: "cash", categoryRef: "services",
      direction: "in", net: 150, vatCode: "standard", sourceRef: "visit_receipt", goto: "visit_receipt" },
    { entryRef: "nursery_supplies", date: "2026-11-16", payee: "Nursery supplies", accountRef: "cash", categoryRef: "supplies",
      direction: "out", net: 24, vatCode: "standard" },
  ] },
  { from: "2026-11-01", to: "2026-11-30", group: "sections", entries: [
    { entryRef: "reserve_out", date: "2026-11-20", payee: "Tax reserve", accountRef: "cash", categoryRef: "transfer",
      direction: "out", net: 40, transferRef: "reserve_move" },
    { entryRef: "reserve_in", date: "2026-11-20", payee: "Tax reserve", accountRef: "reserve", categoryRef: "transfer",
      direction: "in", net: 40, transferRef: "reserve_move" },
    { entryRef: "park_walks", date: "2026-11-24", payee: "Park walks", accountRef: "cash", categoryRef: "services",
      direction: "in", net: 54, sourceRef: "walk_receipt", goto: "walk_receipt" },
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

type LedgerProps = c.Props<typeof props, typeof meta>;
type LedgerRow = ReturnType<typeof ledgerDisplay<LedgerProps["entries"][number]>>["rows"][number];

// prettier-ignore
function LedgerLine({ row, density, heading }: { row: LedgerRow; density: c.ThemeDensity; heading: boolean }) {
  const { entry, date, accountName, account, category, source, transfer, net, vat, gross, balance } = row;
  return <kit.KitContent group={heading ? "response" : "content"} {...{ density }}>
    {heading && <kit.KitText item={entry.id} part="account_heading" role="label" tone="muted">{accountName}</kit.KitText>}
    <kit.KitRow item={entry.id} label={entry.payee} goto={entry.goto} inline {...{ density }}>
      <kit.KitGrid {...{ density }}>
        <kit.KitContent {...{ density }}>
          <kit.KitText part="payee" tone={entry.goto ? "accent" : "text"}>{entry.payee}</kit.KitText>
          {Object.entries({ date, account, category, source, transfer }).map(([part, text]) => text &&
            <kit.KitText key={part} {...{ part }} role="caption" tone="muted">{text}</kit.KitText>)}
        </kit.KitContent>
        <kit.KitContent {...{ density }}>
          <kit.KitText part="gross" role="number" numberScale="compact" tabular>{gross}</kit.KitText>
          {Object.entries({ net, vat, balance }).map(([part, text]) =>
            <kit.KitText key={part} {...{ part }} role="caption" tone="muted">{text}</kit.KitText>)}
        </kit.KitContent>
      </kit.KitGrid>
    </kit.KitRow>
  </kit.KitContent>;
}

// prettier-ignore
function LedgerHeader({ from, to, totalIn, totalOut, density, loading }: Pick<ReturnType<typeof ledgerDisplay>, "from" | "to" | "totalIn" | "totalOut"> & { density: c.ThemeDensity; loading: boolean }) {
  const { words: { ledger: words } } = kit.useWords(booksWordsFor);
  const line = (part: string | null, text: string, role: kit.TextRole) => loading
    ? <kit.KitSkeleton shape="figure" inset="none" content={[[role, text, "start", "compact"]]} {...{ density }} />
    : <kit.KitText {...{ part, role }} tone={role === "caption" ? "muted" : "text"} numberScale="compact" tabular={role === "number"}>{text}</kit.KitText>;
  return <kit.KitContent {...{ density }}>
    {line("title", words.heading, "title")}
    <kit.KitGrid {...{ density }}>{line("from", from, "caption")}{line("to", to, "caption")}</kit.KitGrid>
    <kit.KitRow part={null} label={words.heading} tone="muted" {...{ density }}>
      <kit.KitGrid {...{ density }}>
        <kit.KitContent>{line(null, words.in, "caption")}{line("total_in", totalIn, "number")}</kit.KitContent>
        <kit.KitContent>{line(null, words.out, "caption")}{line("total_out", totalOut, "number")}</kit.KitContent>
      </kit.KitGrid>
    </kit.KitRow>
  </kit.KitContent>;
}

// prettier-ignore
export function Ledger(input: LedgerProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const group = kit.useVariant("group", meta.variants.group, input.group);
  const state = kit.useComponentState(), data = kit.useDeviceData();
  const { lang, words: { ledger: words } } = kit.useWords(booksWordsFor);
  const { rows, ...figures } = ledgerDisplay(input, data, lang);
  const display = group === "sections" ? [...rows].sort((a, b) => a.entry.accountRef.localeCompare(b.entry.accountRef)) : rows;
  const loading = state === "loading";
  return <kit.KitCard part="root" padded {...{ density }}>
    {state === "empty" ? <kit.KitEmpty decorativeIcon /> :
      state === "error" ? <kit.KitEmpty decorativeIcon icon="file_text" title={words.errorTitle} sub={words.error} /> : <>
        <LedgerHeader {...figures} {...{ density, loading }} />
        {loading ? rows.map(({ entry }) => <kit.KitGrid key={entry.id} {...{ density }}>
          <kit.KitSkeleton shape="figure" inset="none" content={[["body", words.heading], ["caption", figures.from], ["caption", words.account], ["caption", words.category]]} />
          <kit.KitSkeleton shape="figure" inset="none" content={[["number", figures.totalIn, "start", "compact"], ["caption", words.net], ["caption", words.vat], ["caption", words.balance]]} />
        </kit.KitGrid>) : display.map((row, index) => <LedgerLine key={row.entry.id} {...{ row, density }}
          heading={group === "sections" && display[index - 1]?.entry.accountRef !== row.entry.accountRef} />)}
        {loading ? <kit.KitSkeleton shape="control" kind="secondary" label={words.export} full /> :
          <kit.KitAction part="export" label={words.export} kind="secondary" full />}
      </>}
  </kit.KitCard>;
}
