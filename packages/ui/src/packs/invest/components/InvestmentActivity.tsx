import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { activityCount, activityCopy, activityReading, type ActivityRow } from "../copy";
import { investWordsFor } from "../lang";
import { activityLedger, portfolioKind, portfolioRecord, type Portfolio } from "../ledger";
import { compareInstants, dateTime, distinct, recordId, seedPortfolio, seedTime } from "../seeds";

// Core first: Timeline/history cannot reconcile trade quantities, cost and cash or retain corrections.
// prettier-ignore
export const meta = {
  id: "InvestmentActivity", status: "ready", group: "data",
  purpose: "Reconcile investment trades, contributions, withdrawals and fees with my holdings and cash.",
  pick: "An investment ledger reconciling buys, sells, deposits, withdrawals, fees and linked dividend receipts. Not everyday spending (Transactions), client payments (ClientHistory), an audit (ActivityLog), or a dated event log (Timeline).",
  writeHints: [
    "Use unique snake_case entry ids and ISO datetimes with offsets. Entries cannot predate since. Do not seed dividend receipts here: they come from Dividends.",
    "For buy or sell, write assetId, units, unitPrice and optional fee, never amount. For deposit, withdrawal or fee, write amount and leave all four trade fields null. Write positive amounts; kind determines direction.",
    "For event and cash movement only, write \"detail\":\"brief\" and retain the trade seeds. Do not write computed balances or proceeds.",
  ],
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "Device records fold after the opening statement, with linked dividend receipts and corrections retained; an action never sends a broker order.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["units", "unit_price", "fee"] } },
  parts: ["root", "add", "add_label", "notice", "count"],
  items: { key: "entries", parts: ["root", "at", "event", "units", "unit_price", "fee", "cash", "status", "void", "void_label"] },
  confirmParts: ["void"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { add: ["press"] },
    items: { root: ["press"], void: ["press"] },
    when: { root: { linked: true }, void: { void: true }, add: { linked: true } },
    noGoto: { items: ["void"] },
  },
  emptyActions: ["add.press"],
  deviceData: activityLedger.deviceData,
  recordRuntime: { ...activityLedger.recordRuntime, project: projectActivity },
  previewDeviceData: ({ input }) => ({
    [portfolioKind]: exampleStatements.filter(({ portfolioId }) => portfolioId === input.portfolioId),
  }),
  read: (input, state, lang, _data, currency) => state === "filled"
    ? activityReading(input as Parameters<typeof activityReading>[0], lang, currency) : [],
} as const satisfies c.Meta;

const key = recordId.meta({ kind: undefined });
// prettier-ignore
const entry = z.strictObject({
  id: key, at: dateTime.meta({ kind: "text" }), kind: z.enum(["deposit", "withdrawal", "buy", "sell", "fee"]),
  voided: z.boolean().default(false), assetId: key.optional(), goto: c.screenId.optional(),
  units: z.number().positive().optional(), unitPrice: z.number().nonnegative().optional(),
  fee: z.number().nonnegative().optional(), amount: z.number().positive().optional(),
}).refine(({ kind, assetId, units, unitPrice, fee, amount }) =>
  kind === "buy" || kind === "sell"
    ? assetId !== undefined && units !== undefined && unitPrice !== undefined && amount === undefined
    : amount !== undefined && assetId === undefined && units === undefined && unitPrice === undefined && fee === undefined,
  { message: "Use trade fields only for a buy or sell; use amount only for a cash event" });
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), portfolioId: key, since: dateTime,
  openingCash: z.number().nonnegative(), openingContributed: z.number(),
  entries: z.array(entry).min(0).max(20), goto: c.screenId.optional(),
}).refine(({ since, entries }) =>
  distinct(entries, ({ id }) => id) && entries.every(({ at }) => compareInstants(at, since) >= 0),
  { path: ["entries"], message: "Use unique entry ids and dates at or after the opening statement" },
).overwrite((input) => ({ ...input, linked: Boolean(input.goto), entries: input.entries.map((row) => ({
    ...row, record_id: row.id, linked: Boolean(row.goto), void: !row.voided,
    fee: row.kind === "buy" || row.kind === "sell" ? (row.fee ?? 0) : undefined,
  })) }));

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { portfolioId: seedPortfolio(input), since: seedTime, openingCash: 0, openingContributed: 0, entries: [] };
}

// prettier-ignore
export const examples = [
  {
    portfolioId: "education", since: seedTime, openingCash: 0, openingContributed: 0, goto: "record_trade",
    entries: [
      { id: "first_deposit", at: "2026-01-02T09:00:00Z", kind: "deposit", amount: 1000 },
      { id: "first_buy", at: "2026-01-02T10:00:00Z", kind: "buy", assetId: "global_fund",
        units: 10, unitPrice: 80, goto: "trade_details" },
    ],
  },
  {
    portfolioId: "pension", since: "2026-02-01T00:00:00Z", openingCash: 40, openingContributed: 550,
    entries: [
      { id: "cancelled_sale", at: "2026-02-10T12:00:00Z", kind: "sell", assetId: "bond_fund",
        units: 0.5, unitPrice: 23, fee: 1, voided: true },
      { id: "cash_out", at: "2026-02-11T12:00:00Z", kind: "withdrawal", amount: 10 },
    ],
  },
] satisfies z.input<typeof props>[];

// prettier-ignore
const exampleStatements: Portfolio[] = [
  { ...examples[0]!, quotes: [], distributions: [],
    positions: [{ assetId: "global_fund", name: "Global Equity Fund", symbol: "GEF", class: "fund", units: 0, unitCost: 0 }] },
  { ...examples[1]!, quotes: [], distributions: [],
    positions: [{ assetId: "bond_fund", name: "Short Bond Fund", symbol: "SBF", class: "bond", units: 25, unitCost: 22 }] },
].map(({ portfolioId, since, openingCash, openingContributed, entries, ...fixture }) =>
  portfolioRecord.parse({ portfolioId, since, openingCash, openingContributed, entries, quotes: fixture.quotes,
    positions: fixture.positions, distributions: fixture.distributions }));

// prettier-ignore
function projectActivity(context: c.RecordContext): c.Values {
  if (!Object.hasOwn(context.data, portfolioKind)) return {
    entries: [...(context.props.entries as ActivityRow[])].sort((a, b) => compareInstants(a.at, b.at)),
  };
  const records = context.data[portfolioKind];
  const preview = records?.some((record) => exampleStatements.some((statement) => statement === record));
  const now = preview && context.now === 0 ? Date.parse("2026-03-20T00:00:00Z") : context.now;
  const live = activityLedger.recordRuntime.project({ ...context, now });
  const statement = records?.map((record) => portfolioRecord.safeParse(record))
    .find((result) => result.success && result.data.portfolioId === context.props.portfolioId)?.data;
  const last = context.journal.at(-1) as { kind?: string; id?: string } | undefined;
  const rows = (live.entries ?? []) as (ActivityRow & { recordId: string })[];
  return { ...live, corrected: last?.kind === "void" && rows.some((row) => row.recordId === last.id && row.voided),
    entries: rows.map((row) => ({ ...row, assetName: statement?.positions.find(({ assetId }) => row.assetId === assetId)?.name })) };
}

const { choose, write, read } = c.probesFor("InvestmentActivity");
const brief =
  "Use portfolio education, opening statement at 2026-01-01T00:00:00Z with zero opening cash and contributed. Record first_deposit, 1000 on 2026-01-02T09:00:00Z, and first_buy, 10 units of global_fund at 80 on 2026-01-02T10:00:00Z.";
// prettier-ignore
export const probes = [
  choose("Record my portfolio's deposits, withdrawals, purchases and sales. Track units and fees so every trade reconciles with the balance and can be corrected."),
  choose("Show the dates and titles of previous book club meetings as a simple event history, no cash or trade entries.", "Timeline"),
  write(brief),
  {
    ...write(`${brief} Show the event and cash movement only, without the trade breakdown; keep it in the records.`),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the form to add a trade, rather than opening an existing entry.", { address: "i1/add", action: "press" }),
] satisfies c.Probe[];

type ActivityProps = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;
// prettier-ignore
function LedgerRow({ row, density, full, loading }: { row: ActivityRow; density: Density; full: boolean; loading: boolean }) {
  const context = kit.usePartContext();
  const { words: { activity: words }, lang } = kit.useWords(investWordsFor);
  const { event, cash, at, tone, status, ...details } = activityCopy(row, lang, kit.useAppCurrency());
  const breakdown = full ? Object.entries(details).filter(([, value]) => value !== undefined) : [], dateWithCorrection = row.void && !breakdown.length;
  const dated = loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["caption", status ? [at, status].join(words.detailSeparator) : at]]} /> :
    <kit.KitText part={null} role="caption" tone="muted">
      <kit.KitText part="at" role="caption" tone="muted">{at}</kit.KitText>
      {status && <>{words.detailSeparator}<kit.KitText part="status" role="caption" tone="muted" emphasis="strong">{status}</kit.KitText></>}
    </kit.KitText>;
  const amount = loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["number", cash, "end", "compact"]]} />
    : <kit.KitText part="cash" role="number" numberScale="compact" tone={tone} strike={row.voided === true} tabular>{cash}</kit.KitText>;
  const detail = breakdown.length > 0 && (loading ?
    <kit.KitSkeleton shape="figure" inset="none" content={[["caption", breakdown.map(([, value]) => value).join(words.detailSeparator)]]} /> :
    <kit.KitText part={null} role="caption" tone="muted">{breakdown.map(([part, value], index) =>
      <kit.KitText key={part} {...{ part }} role="caption" tone="muted">{index ? words.detailSeparator : undefined}{value}</kit.KitText>)}</kit.KitText>);
  const correction = row.void && <kit.KitRow part={loading ? null : "void"} label={words.void}
    {...(loading ? {} : { role: "button" as const })} inline density={density} lineRole="label">
    {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", words.void]]} /> :
      <kit.KitText part="void_label" role="label" tone="muted">{words.void}</kit.KitText>}</kit.KitRow>;
  return <kit.PartContext.Provider value={{ ...context, item: row.id }}>
    <kit.KitContent density={density}>
      <kit.KitRow {...(loading ? {} : { role: "group" as const })} label={row.at} part={loading ? null : "root"} density={density}
        inline lineRole="label" goto={loading ? undefined : row.goto} trailing={amount}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", event]]} /> :
          <kit.KitText part="event" role="label" tone={row.goto ? "accent" : "text"}>{event}</kit.KitText>}
        {!dateWithCorrection && dated}
      </kit.KitRow>
      {correction ? <kit.KitGrid fitLast density={density}>{dateWithCorrection ? dated : detail}{correction}</kit.KitGrid> : detail}
    </kit.KitContent>
  </kit.PartContext.Provider>;
}

// prettier-ignore
export function InvestmentActivity(input: ActivityProps) {
  const { words: { activity: words }, lang } = kit.useWords(investWordsFor);
  const density = kit.useKit().density;
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const source = kit.useComponentState(), live = kit.useLiveControls(meta, input), thing = kit.useEmptyThing();
  const state = source === "filled" ? (live.state as c.StateName | undefined) ?? source : source;
  const rows = live.entries as ActivityRow[], loading = state === "loading";
  const hidden = Number(live.entryCount ?? rows.length) - rows.length;
  const empty = state === "empty" || (state === "filled" && !rows.length);
  return <kit.KitCard part="root" padded={state !== "success" && (!empty || Boolean(input.goto))} density={density}>
    {state === "error" ? <kit.KitText part="notice" tone="muted">{words.error}</kit.KitText> :
      state === "success" ? <kit.KitEmpty part="notice" icon="check" tone="good" title={words.saved} decorativeIcon /> :
      empty ? input.goto ? <kit.KitContent align="center" density={density} group="response">
        <kit.KitIcon name="sparkles" scale="lg" tone="muted" decorative />
        <kit.KitText part="notice" tone="muted" align="center">{c.emptyLine(thing, lang)}</kit.KitText>
      </kit.KitContent> : <kit.KitEmpty part="notice" decorativeIcon /> : <>
        {state === "filled" && live.corrected === true && <kit.KitText part="notice" role="caption" tone="good">{words.corrected}</kit.KitText>}
        {hidden > 0 && !loading && <kit.KitText part="count" role="caption" tone="muted">{activityCount(hidden, lang)}</kit.KitText>}
        {loading && !rows.length ? <kit.KitSkeleton density={density} /> : <kit.KitGrid list arrange="rows" density={density} listRowGap="group">
          {rows.map((row) => <LedgerRow key={row.id} {...{ row, density, full, loading }} />)}
        </kit.KitGrid>}
      </>}
    {input.goto && (state === "filled" || empty || loading) && <kit.KitContent group={empty ? "content" : "response"} density={density}>
      {loading ? <kit.KitSkeleton shape="control" kind="quiet" inset="none" label={words.add} full /> :
        <kit.KitAction part="add" kind="quiet" label={words.add} goto={input.goto} full />}
    </kit.KitContent>}
  </kit.KitCard>;
}
