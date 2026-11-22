import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { dividendCopy, dividendReading, type DividendRow } from "../copy";
import { investWordsFor } from "../lang";
import { dividendsLedger, portfolioKind, portfolioRecord, type Portfolio } from "../ledger";
import { compareInstants, dateTime, distinct, recordId, seedAssets, seedPortfolio, seedTime } from "../seeds";
import { prompt } from "../../../entry/prompt-Dividends.generated";

// Core first: Timeline/history shows past dates, not per-unit distributions, eligibility or cash receipt.
// prettier-ignore
export const meta = {
  id: "Dividends", status: "ready", group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 2, tier: "phone",
  realPath:
    "Device records freeze ledger entitlement at the entitlement time; actual receipt credits cash once per distribution, and void reverses that receipt without deleting the distribution.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["entitled_at", "per_unit", "units", "gross", "withheld"] } },
  parts: ["root", "notice"],
  items: {
    key: "distributions",
    parts: ["root", "asset", "entitled_at", "pay_on", "per_unit", "units", "gross", "withheld", "net", "status",
      "receive", "receive_label", "void", "void_label"],
    visibleWhen: { visible: true },
  },
  confirmParts: ["void"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { root: ["press"], receive: ["press"], void: ["press"] },
    when: { root: { linked: true }, receive: { receive: true }, void: { void: true } },
    noGoto: { items: ["receive", "void"] },
  },
  deviceData: dividendsLedger.deviceData,
  recordRuntime: { ...dividendsLedger.recordRuntime, project: projectDividends },
  previewDeviceData: ({ input }) => ({
    [portfolioKind]: exampleStatements.filter(({ portfolioId }) => portfolioId === input.portfolioId),
  }),
  read: (input, state, lang, _data, currency) => state === "filled"
    ? dividendReading(input as Parameters<typeof dividendReading>[0], lang, currency) : [],
} as const satisfies c.Meta;

const key = recordId.meta({ kind: undefined });
// prettier-ignore
const distribution = z.strictObject({
  id: key, assetId: key, entitledAt: dateTime.meta({ kind: "text" }), payOn: c.isoDate,
  perUnit: z.number().positive(), withheld: z.number().nonnegative().default(0),
  receivedAt: dateTime.optional(), goto: c.screenId.optional(),
}).refine(({ entitledAt, payOn, receivedAt }) =>
  payOn >= entitledAt.slice(0, 10) &&
  (!receivedAt || (compareInstants(receivedAt, entitledAt) >= 0 && receivedAt.slice(0, 10) >= payOn)),
  { path: ["receivedAt"], message: "Pay on or after entitlement and record receipt on or after payment day" });
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), portfolioId: key,
  distributions: z.array(distribution).min(1).max(6), style: z.enum(["upcoming", "received"]).default("upcoming"),
}).refine(({ distributions }) => distinct(distributions, ({ id }) => id), { path: ["distributions"] })
  .overwrite((input) => ({ ...input, distributions: input.distributions.map((row) => ({
    ...row, record_id: row.id, linked: Boolean(row.goto), received: Boolean(row.receivedAt),
    receive: !row.receivedAt, void: Boolean(row.receivedAt),
    visible: input.style !== "received" || Boolean(row.receivedAt),
  })) }));

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    portfolioId: seedPortfolio(input),
    distributions: seedAssets(input, 1).map(({ assetId }) => ({
      id: "item_1", assetId, entitledAt: seedTime, payOn: seedTime.slice(0, 10), perUnit: 1,
    })),
  };
}

// prettier-ignore
export const examples = [
  {
    portfolioId: "education",
    distributions: [
      {
        id: "mar_distribution", assetId: "global_fund", entitledAt: "2026-03-01T00:00:00Z",
        payOn: "2026-03-10", perUnit: 1, withheld: 2, goto: "global_fund",
      },
    ],
  },
  {
    portfolioId: "pension", style: "received",
    distributions: [
      {
        id: "feb_distribution", assetId: "bond_fund", entitledAt: "2026-02-01T00:00:00Z",
        payOn: "2026-02-12", perUnit: 0.75, receivedAt: "2026-02-12T08:00:00Z",
      },
    ],
  },
] satisfies z.input<typeof props>[];

// prettier-ignore
const exampleStatements: Portfolio[] = [
  { portfolioId: "education", since: seedTime, openingCash: 0, openingContributed: 800, entries: [], quotes: [],
    positions: [{ assetId: "global_fund", name: "Global Equity Fund", symbol: "GEF", class: "fund", units: 10, unitCost: 80 }],
    distributions: examples[0]!.distributions },
  { portfolioId: "pension", since: seedTime, openingCash: 0, openingContributed: 550, entries: [], quotes: [],
    positions: [{ assetId: "bond_fund", name: "Short Bond Fund", symbol: "SBF", class: "bond", units: 25, unitCost: 22 }],
    distributions: examples[1]!.distributions },
];

// prettier-ignore
function projectDividends(context: c.RecordContext): c.Values {
  if (!Object.hasOwn(context.data, portfolioKind)) return {};
  const records = context.data[portfolioKind];
  const example = records?.some((record) => exampleStatements.some((statement) => statement === record));
  const now = example && context.now === 0 ? Date.parse("2026-03-20T00:00:00Z") : context.now;
  const live = dividendsLedger.recordRuntime.project({ ...context, now });
  const statement = records?.map((record) => portfolioRecord.safeParse(record))
    .find((result) => result.success && result.data.portfolioId === context.props.portfolioId)?.data;
  const last = context.journal.at(-1) as { kind?: string; id?: string } | undefined;
  const rows = (live.distributions ?? []) as (DividendRow & { recordId: string })[];
  return { ...live, receiptRecorded: last?.kind === "receive" && rows.some((row) => row.recordId === last.id && row.receivedAt),
    distributions: rows.map(({ entitledAt, ...row }) => ({ ...row, entitlement: entitledAt,
      assetName: statement?.positions.find(({ assetId }) => row.assetId === assetId)?.name })) };
}

const { choose, write, read } = c.probesFor("Dividends");
// prettier-ignore
export const probes = [
  choose("Track per-unit cash distributions from my investments. Show the entitlement and pay dates, withholding, and let me record when the payout arrives."),
  choose("Show a dated history of past club meetings in order, with just date and event name, no money or actions.", "Timeline"),
  write("Record a pending distribution for portfolio education, id mar_distribution, asset global_fund, entitled at 2026-03-01T00:00:00Z, due 2026-03-10, with 1 per unit and 2 withheld. It hasn't arrived yet."),
  { ...write("Show a distribution for education, mar_distribution for global_fund. Entitled 2026-03-01T00:00:00Z, pay date 2026-03-10, amount 1 per unit. On screen just show the instrument, status, pay date and net cash."), variant: { axis: "detail", value: "brief" } },
  read("Record receipt of the distribution, not navigation to the fund.", { address: "d1/r1/receive", action: "press" }),
] satisfies c.Probe[];

type DividendProps = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;
// prettier-ignore
function DividendItem({ row, density, full, loading }: { row: DividendRow; density: Density; full: boolean; loading: boolean }) {
  const { words: { dividends: words }, lang } = kit.useWords(investWordsFor);
  const copy = dividendCopy(row, lang, kit.useAppCurrency());
  const context = kit.usePartContext();
  const label = (part: "pay_on" | "entitled_at" | "per_unit" | "units" | "gross" | "withheld") => loading ?
    <kit.KitSkeleton shape="figure" inset="none" content={[["caption", copy[part]]]} /> :
    <kit.KitText {...{ part }} role="caption" tone="muted">{copy[part]}</kit.KitText>;
  const action = row.receive ? { part: "receive", label: words.receive, kind: "secondary" } as const
    : row.void ? { part: "void", label: words.reverse, kind: "danger" } as const : undefined;
  return <kit.PartContext.Provider value={{ ...context, item: row.id }}>
    <kit.KitContent density={density}>
      <kit.KitRow part={loading ? null : "root"} label={copy.asset} goto={loading ? undefined : row.goto} inline density={density} lineRole="label"
        trailing={!loading && row.goto ? <kit.KitIcon name="chevron_right" scale="sm" decorative /> : undefined}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", copy.asset], ["caption", copy.status]]} /> : <>
          <kit.KitText part="asset" role="label" emphasis="strong">{copy.asset}</kit.KitText>
          <kit.KitText part="status" role="caption" tone={row.receivedAt ? "good" : "muted"}>{copy.status}</kit.KitText>
        </>}
      </kit.KitRow>
      <kit.KitGrid density="comfortable">
        <kit.KitContent density={density}>
          {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["caption", words.net], ["number", copy.net]]} /> : <>
            <kit.KitText part={null} role="caption" tone="muted">{words.net}</kit.KitText>
            <kit.KitText part="net" role="number" tabular>{copy.net}</kit.KitText>
          </>}
          {full && label("gross")}{full && label("withheld")}
        </kit.KitContent>
        <kit.KitContent density={density}>
          {label("pay_on")}{full && label("entitled_at")}
          {full && <kit.KitContent group="response" density={density}>{label("units")}{label("per_unit")}</kit.KitContent>}
        </kit.KitContent>
      </kit.KitGrid>
      {action && <kit.KitContent group="response" density={density}>{loading ?
        <kit.KitSkeleton shape="control" inset="none" kind={action.kind} label={action.label} /> :
        <kit.KitAction {...action} />}</kit.KitContent>}
    </kit.KitContent>
  </kit.PartContext.Provider>;
}

// prettier-ignore
export function Dividends(input: DividendProps) {
  const { words: { dividends: words } } = kit.useWords(investWordsFor);
  const density = kit.useKit().density;
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const source = kit.useComponentState(), live = kit.useLiveControls(meta, input);
  const state = source === "filled" ? (live.state as c.StateName | undefined) ?? source : source;
  const rows = c.visibleItems(meta, live) as DividendRow[];
  const empty = state === "empty" || (state === "filled" && !rows.length);
  return <kit.KitCard part="root" padded={!empty && state !== "success"} density={density}>
    {state === "error" ? <kit.KitText part="notice" role="label" tone="muted">{words.error}</kit.KitText> :
      state === "success" ? <kit.KitEmpty part="notice" icon="check" tone="good" title={words.saved} decorativeIcon /> :
      empty ? <kit.KitEmpty part="notice" decorativeIcon /> : <>
        {state === "filled" && live.receiptRecorded === true && <kit.KitText part="notice" role="caption" tone="good">{words.saved}</kit.KitText>}
        <kit.KitGrid list arrange="rows" density={density}>
          {(state === "loading" && !rows.length ? input.distributions : rows).map((row) =>
            <DividendItem key={row.id} {...{ row, density, full }} loading={state === "loading"} />)}
        </kit.KitGrid>
      </>}
  </kit.KitCard>;
}
