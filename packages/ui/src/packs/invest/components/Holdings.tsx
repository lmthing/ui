import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { holdingCopy, holdingsReading } from "../copy";
import { investWordsFor } from "../lang";
import { holdingsLedger, portfolioKind } from "../ledger";
import { dateTime, distinct, recordId, seedAssets, seedPortfolio, seedTime } from "../seeds";

// Core first: List/value can show one value per row, not owned units, cost and valued positions together.
export const meta = {
  id: "Holdings",
  status: "ready",
  group: "data",
  purpose: "See the investments I own, their units, current value and unrealised gain.",
  pick: "Owned investment positions with units, cost basis, dated quotes and unrealised gain. Not account balances (AccountCard), plain rows (List), things in storage (Things), or unowned investments (Watchlist).",
  writeHints: [
    "Use short snake_case record ids and ISO datetimes with offsets. Write opening units and unit cost, not computed value or gain. Zero opening units register an instrument for later activity.",
    'To show just units and value, write "detail":"brief","density":null and retain the seed data. Only an explicit spacing request sets density; never fill in "comfortable".',
    "A single-position filter uses an assetId from the portfolio.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "An on-device opening statement and later trades use stored dated quotes; live refresh needs a market data service, and missing quotes stay unknown.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["unit_cost", "price", "quoted_at", "gain"] } },
  parts: ["root", "refresh", "refresh_label", "notice", "count"],
  items: {
    key: "positions",
    parts: ["root", "name", "symbol", "units", "unit_cost", "price", "quoted_at", "value", "gain"],
    visibleWhen: { visible: true },
  },
  partTiers: { refresh: "service" },
  states: ["filled", "empty", "loading", "error"],
  deviceData: holdingsLedger.deviceData,
  recordRuntime: {
    ...holdingsLedger.recordRuntime,
    project: (context) =>
      Object.hasOwn(context.data, portfolioKind) ? holdingsLedger.recordRuntime.project(context) : {},
  },
  actions: {
    parts: { refresh: ["press"] },
    items: { root: ["press"] },
    when: { root: { linked: true }, refresh: { quote_service: true } },
  },
  read: (input, state, lang, _data, currency): string[] =>
    state === "filled" ? holdingsReading(input as Parameters<typeof holdingsReading>[0], lang, currency) : [],
} as const satisfies c.Meta;

// prettier-ignore
const position = z.strictObject({
  assetId: recordId.meta({ kind: undefined }), name: c.text(32), symbol: c.text(12),
  class: z.enum(["equity", "bond", "fund", "crypto", "other"]),
  units: z.number().nonnegative(), unitCost: z.number().nonnegative(),
  price: z.number().nonnegative(), quotedAt: dateTime, goto: c.screenId.optional(),
});

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), portfolioId: recordId.meta({ kind: undefined }), asOf: dateTime,
  positions: z.array(position).min(0).max(6), assetId: recordId.meta({ kind: undefined }).optional(),
}).refine(({ positions }) => distinct(positions, ({ assetId }) => assetId), { path: ["positions"] })
  .overwrite((input) => ({ ...input, positions: input.positions.map((row) => ({
    ...row, visible: row.units > 0 && (!input.assetId || input.assetId === row.assetId),
    linked: Boolean(row.goto),
  })) }));

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    portfolioId: seedPortfolio(input), asOf: seedTime,
    positions: seedAssets(input, 3).map((asset) => ({
      ...asset, class: "other", units: 0, unitCost: 0, price: 0, quotedAt: seedTime,
    })),
  };
}

// prettier-ignore
export const examples = [
  {
    portfolioId: "education", asOf: "2026-01-01T00:00:00Z",
    positions: [
      { assetId: "global_fund", name: "Global Equity Fund", symbol: "GEF", class: "fund",
        units: 10, unitCost: 80, price: 90, quotedAt: "2026-03-01T16:00:00Z", goto: "global_fund" },
      { assetId: "income_fund", name: "Income Fund", symbol: "IFD", class: "fund",
        units: 3, unitCost: 57, price: 55, quotedAt: "2026-03-01T16:00:00Z" },
    ],
  },
  {
    portfolioId: "pension", asOf: "2026-02-01T00:00:00+01:00",
    assetId: "bond_fund", density: "comfortable",
    positions: [
      { assetId: "bond_fund", name: "Short Bond Fund", symbol: "SBF", class: "bond",
        units: 4.5, unitCost: 22, price: 23, quotedAt: "2026-02-12T16:00:00+01:00" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Holdings");
const brief =
  "Use portfolio id education, opening at 2026-01-01T00:00:00Z. I owned 10 Global Equity Fund units (global_fund, GEF, fund) at a unit cost of 80, quoted 90 at 2026-03-01T16:00:00Z.";
export const probes = [
  choose(
    "Show the funds I actually own, with units, what I paid per unit, dated prices and my unrealised gain on each.",
  ),
  choose(
    "Show three saved fund names as plain tappable rows. Just their names and links, no prices or units.",
    "List",
  ),
  write(brief),
  {
    ...write(
      `${brief} Show only units and value beside the name; hide cost, quote details and gain but keep their seed data.`,
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the Global Equity Fund position.", { address: "h1/r1", action: "press" }),
] satisfies c.Probe[];

export function bindHoldings(hasQuoteService: (instance: string) => boolean): c.Definition {
  const live = {
    derive: (_input: Readonly<c.Values>, id: string) => ({ quote_service: hasQuoteService(id) }),
  };
  return { props, fallback, examples, probes, meta: { ...meta, live } };
}

type HoldingProps = c.Props<typeof props, typeof meta>;
type Position = Omit<HoldingProps["positions"][number], "price" | "quotedAt"> & {
  price?: number | undefined;
  quotedAt?: string | undefined;
  value?: number | null;
  gain?: number | null;
};
type Density = NonNullable<HoldingProps["density"]>;
// prettier-ignore
type Line = [part: string, text: string, role?: "caption" | "label" | "number", tone?: "muted" | "text" | "good" | "bad"];

// prettier-ignore
function HoldingLines({ lines, density, loading, link }: { lines: Line[]; density: Density; loading: boolean; link?: boolean }) {
  const { words: { holdings: words } } = kit.useWords(investWordsFor);
  const fields = lines.map(([part, text, role = "caption", tone = "muted"]) => {
    const emphasis = part === "value" ? "quiet" : "normal";
    if (loading) return <kit.KitSkeleton key={part} shape="figure" inset="none" {...{ density, emphasis }}
      content={[[role, part === "value" ? [words.valueLabel, text].join(words.valueGap) : text, "start", "compact"]]} />;
    const field = <kit.KitText key={part} {...{ part, role, tone, density, emphasis }} tabular numberScale="compact">
      {part === "value" && <><kit.KitText part={null} role="label" tone="muted" density={density}>
        {words.valueLabel}</kit.KitText>{words.valueGap}</>}{text}
    </kit.KitText>;
    return link && part === "value" ? <kit.KitGrid key={part} fitLast density={density}>
      {field}<kit.KitIcon name="chevron_right" scale="sm" decorative />
    </kit.KitGrid> : field;
  });
  return <>{fields}</>;
}

// prettier-ignore
function HoldingRow({ row, density, detail, state }: { row: Position; density: Density; detail: HoldingProps["detail"]; state: c.StateName }) {
  const { lang } = kit.useWords(investWordsFor);
  const copy = holdingCopy(row, lang, kit.useAppCurrency());
  const loading = state === "loading", goto = state === "filled" ? row.goto : undefined;
  const left: Line[] = [["name", row.name, "label", "text"], ["symbol", row.symbol], ["units", copy.units]];
  const right: Line[] = [["value", copy.value, "number", "text"]];
  if (detail === "full") {
    left.push(["unit_cost", copy.unitCost]);
    right.push(["gain", copy.gain, "caption", copy.gainTone], ["price", copy.price], ["quoted_at", copy.date]);
  }
  return <kit.KitRow inline item={row.id} part={loading ? null : "root"} label={row.name} {...{ density, goto }}>
    <kit.KitGrid density={density}>
      <HoldingLines lines={left} {...{ density, loading }} />
      <HoldingLines lines={right} {...{ density, loading }} link={Boolean(goto)} />
    </kit.KitGrid>
  </kit.KitRow>;
}

// prettier-ignore
export function Holdings(input: HoldingProps) {
  const sourceState = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const live = kit.useLiveControls(meta, input);
  const { lang, words: { holdings: words } } = kit.useWords(investWordsFor);
  const rows = c.visibleItems(meta, live) as Position[];
  const state = sourceState === "filled" ? (live.state as c.StateName | undefined) ?? sourceState : sourceState;
  const remaining = (typeof live.positionCount === "number" ? live.positionCount : rows.length) - rows.length;
  const empty = state === "empty" || (state === "filled" && !rows.length);
  return <kit.KitCard part="root" density={density} padded={!empty}>
    {state === "error" && <kit.KitText part="notice" role="body" tone="muted">
      {typeof live.ledgerError === "string" ? words.ledgerUnavailable : words.refreshFailed}</kit.KitText>}
    {empty ? <kit.KitEmpty part="notice" decorativeIcon /> :
      state === "loading" && !rows.length ? <kit.KitSkeleton lead="none" inset="none" density={density} /> :
        <kit.KitGrid list arrange="rows" density={density} listRowGap={density === "compact" ? "group" : "cards"}>
          {rows.map((row) => <HoldingRow key={row.id} {...{ row, density, detail, state }} />)}
        </kit.KitGrid>}
    {remaining > 0 && state === "filled" && <kit.KitText part="count" role="caption" tone="muted">
      {c.wordsFor(lang).peekCount(c.numberLine(remaining, lang))}</kit.KitText>}
    {live.quote_service === true && state === "filled" && <kit.KitAction part="refresh" label={words.refresh} kind="quiet" />}
  </kit.KitCard>;
}
