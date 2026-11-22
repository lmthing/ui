import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  performanceChoices,
  performancePointCopy,
  performanceRanges,
  performanceReading,
  type PerformancePoint,
} from "../copy";
import { investWordsFor } from "../lang";
import { performanceLedger, portfolioKind, type Portfolio } from "../ledger";
import { compareInstants, dateTime, distinct, recordId, seedAssets, seedPortfolio, seedTime } from "../seeds";
import { prompt } from "../../../entry/prompt-Performance.generated";

// Core first: Sparkline/full shows a single trend, not portfolio value and net money invested together.
// prettier-ignore
export const meta = {
  id: "Performance", status: "ready", group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 2, tier: "phone",
  realPath: "The device replays the opening statement, trades, cash flows and receipts for each observation, valuing positions from stored quotes without a market service.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["summary"] } },
  parts: ["root", "title", "range", "legend", "summary", "value", "contributed", "gain", "observations", "dates", "notice"],
  items: { key: "samples", parts: ["root", "at", "value", "contributed", "gain"] },
  states: ["filled", "empty", "loading", "error"],
  deviceData: performanceLedger.deviceData,
  emptyActions: performanceLedger.emptyActions,
  recordRuntime: {
    ...performanceLedger.recordRuntime,
    project: (context) => {
      const records = context.data[portfolioKind];
      if (!Object.hasOwn(context.data, portfolioKind)) return {};
      // The gallery freezes its clock at epoch zero, before these synthetic statements.
      const preview = records?.some((record) => exampleStatements.some((demo) => demo === record));
      return performanceLedger.recordRuntime.project(preview && context.now === 0
        ? { ...context, now: Date.parse("2026-05-02T00:00:00Z") } : context);
    },
  },
  previewDeviceData: ({ input }) => ({
    [portfolioKind]: exampleStatements.filter(({ portfolioId }) => portfolioId === input.portfolioId),
  }),
  actions: { parts: { range: ["select"] }, items: { root: ["select"] } },
  selections: { range: { prop: "range", choices: performanceChoices } },
  select: { prop: "selected_point", value: { field: "at" } },
  read: (input, state, lang, _data, currency) => state === "filled"
    ? performanceReading(input as Parameters<typeof performanceReading>[0], lang, currency) : [],
} as const satisfies c.Meta;
const quote = z.strictObject({ assetId: recordId, price: z.number().nonnegative() });
const sample = z
  .strictObject({ at: dateTime, quotes: z.array(quote).min(0).max(12) })
  .refine(({ quotes }) => distinct(quotes, ({ assetId }) => assetId), { path: ["quotes"] });
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), portfolioId: recordId.meta({ kind: undefined }), title: c.text(32),
  samples: z.array(sample).min(2).max(60), range: z.enum(performanceRanges).default("all"),
}).refine(({ samples }) =>
  samples.every(({ at }, index) => index === 0 || compareInstants(samples[index - 1]!.at, at) < 0),
  { path: ["samples"], message: "Use unique observations in chronological order" });

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    portfolioId: seedPortfolio(input), title: seedAssets(input, 1)[0]!.name,
    samples: [seedTime, "2026-01-02T00:00:00Z"].map((at) => ({ at, quotes: [] })),
  };
}

// prettier-ignore
export const examples = [
  {
    portfolioId: "education", title: "Education portfolio",
    samples: [
      { at: "2026-01-01T00:00:00Z", quotes: [] },
      { at: "2026-03-01T16:00:00Z", quotes: [{ assetId: "global_fund", price: 90 }] },
      { at: "2026-04-01T16:00:00Z", quotes: [{ assetId: "global_fund", price: 86 }] },
      { at: "2026-05-01T16:00:00Z", quotes: [{ assetId: "global_fund", price: 98 }] },
    ],
  },
  {
    portfolioId: "pension", title: "Pension performance", range: "year",
    samples: [
      { at: "2026-02-01T00:00:00+01:00", quotes: [{ assetId: "bond_fund", price: 22 }] },
      { at: "2026-02-12T16:00:00+01:00", quotes: [{ assetId: "bond_fund", price: 23 }] },
      { at: "2026-03-01T16:00:00+01:00", quotes: [{ assetId: "bond_fund", price: 21 }] },
    ],
  },
] satisfies z.input<typeof props>[];

// prettier-ignore
const exampleStatements = [
  { portfolioId: "education", since: seedTime,
    openingCash: 800, openingContributed: 800, quotes: [], distributions: [],
    positions: [{ assetId: "global_fund", name: "Global Equity Fund", symbol: "GEF", class: "fund", units: 0, unitCost: 0 }],
    entries: [{ id: "buy", kind: "buy", at: "2026-01-02T00:00:00Z", assetId: "global_fund", units: 10, unitPrice: 80 },
      { id: "deposit", kind: "deposit", at: "2026-04-02T00:00:00Z", amount: 100 }] },
  { portfolioId: "pension", since: "2026-02-01T00:00:00+01:00",
    openingCash: 80, openingContributed: 300, quotes: [], distributions: [], entries: [],
    positions: [{ assetId: "bond_fund", name: "Short Bond Fund", symbol: "SBF", class: "fund", units: 10, unitCost: 22 }] },
] satisfies Portfolio[];

const { choose, write, read } = c.probesFor("Performance");
// prettier-ignore
export const probes = [
  choose("Plot my total portfolio value against net money I have contributed as two lines on the same dates, showing the difference as profit or loss."),
  choose("Show just the latest soil moisture reading with a tiny line of recent readings, without axes or a second series.", "Sparkline"),
  write("Title it Education portfolio, id education, all time. The opening observation on 2026-01-01T00:00:00Z has no owned assets or quotes. At 2026-03-01T16:00:00Z the global_fund quote is 90. Use the quotes, not guessed totals."),
  {
    ...write("Title it Education portfolio, id education, all time. At 2026-01-01T00:00:00Z no quotes. At 2026-03-01T16:00:00Z global_fund is 90. Keep the chart and money figures, but omit the heading above the valuation figures."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Select the observation dated 2026-03-01 at 16:00 UTC.", { address: "p1/r2", action: "select" }),
] satisfies c.Probe[];

type PerformanceProps = c.Props<typeof props, typeof meta>;
type Density = c.ThemeDensity;
// prettier-ignore
function PerformanceFigures({ point, item, density, full, loading }: { point: PerformancePoint; item?: string; density: Density; full: boolean; loading: boolean }) {
  const { words: { performance: words }, lang } = kit.useWords(investWordsFor);
  const copy = performancePointCopy(point, lang, kit.useAppCurrency());
  const summary = item ? words.selected : words.latest;
  const amount = (part: "value" | "contributed" | "gain") => {
    const scale = part === "value" ? "display" : "compact";
    const emphasis = part === "value" ? "normal" : "quiet";
    return loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ emphasis }} content={[[ "caption", words[part] ], [ "number", copy[part], "start", scale ]]} />
      : <kit.KitContent density={density}>
        <kit.KitText part={null} role="caption" tone="muted">{words[part]}</kit.KitText>
        <kit.KitText {...{ part, emphasis }} {...(item ? { item } : {})} role="number" numberScale={scale} tabular
          tone={part === "gain" ? copy.tone : "text"}>{copy[part]}</kit.KitText>
      </kit.KitContent>;
  };
  return <kit.KitContent density={density} group="response">
    {loading ? <kit.KitSkeleton shape="figure" inset="none" content={full ? [["label", summary], ["caption", copy.at]] : [["caption", copy.at]]} /> : <kit.KitContent density={density}>
      {full && <kit.KitText part="summary" role="label">{summary}</kit.KitText>}
      <kit.KitText part={item ? "at" : null} {...(item ? { item } : {})} role="caption" tone="muted">{copy.at}</kit.KitText>
    </kit.KitContent>}
    <kit.KitContent density={density} group="response"><kit.KitGrid density={density}>
      {amount("value")}
      <kit.KitContent density={density}>{amount("contributed")}{amount("gain")}</kit.KitContent>
    </kit.KitGrid></kit.KitContent>
  </kit.KitContent>;
}

// prettier-ignore
function PerformancePlot({ samples, selected, loading, density }: { samples: PerformancePoint[]; selected?: string | undefined; loading: boolean; density: Density }) {
  const { words: { performance: words }, lang } = kit.useWords(investWordsFor);
  const unit = kit.useAppCurrency() ?? c.defaultCurrency;
  const keys = [["value", words.value, "accent"], ["contributed", words.contributed, "muted"]] as const;
  const series = keys.map(([id, label, tone], placeholder) => ({ id, label, tone, points: samples.map((point) => ({
    id: point.id, x: Date.parse(point.at), value: loading ? placeholder : (point[id] ?? null), label: performancePointCopy(point, lang).day,
  })) }));
  const ready = samples.some(({ contributed }) => typeof contributed === "number");
  return <>
    {ready || loading ? <kit.KitLinePlot part="legend" {...{ series, loading, unit }} {...(!loading && selected ? { selected } : {})} />
      : <kit.KitText part="notice" tone="muted">{words.unavailable}</kit.KitText>}
    <kit.KitContent group="response" density={density}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[[ "caption", words.observations ]]} />
        : <kit.KitText part="observations" role="caption" tone="muted">{words.observations}</kit.KitText>}
      <kit.KitTrack part="dates" role="radiogroup" label={words.observations}>
        {samples.map((point) => <kit.KitChip key={point.id} item={point.id} role="radio" disabled={loading || undefined} labelPart={null}
          label={performancePointCopy(point, lang).day} on={!loading && selected === point.id} />)}
      </kit.KitTrack>
    </kit.KitContent>
  </>;
}

// prettier-ignore
export function Performance(input: PerformanceProps) {
  const { words: { performance: words } } = kit.useWords(investWordsFor);
  const density = kit.useKit().density;
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const source = kit.useComponentState(), live = kit.useLiveControls(meta, input);
  const state = source === "filled" ? (live.state as c.StateName | undefined) ?? source : source;
  const loading = state === "loading";
  const points = live.samples as PerformancePoint[], samples = loading && !points.length ? input.samples : points;
  const selected = samples.find(({ at }) => at === live.selected_point), point = selected ?? samples.at(-1);
  return <kit.KitCard part="root" padded density={density}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[[ "label", input.title ]]} />
      : <kit.KitText part="title" role="label" emphasis="strong">{input.title}</kit.KitText>}
    {loading ? <kit.KitRow label={words.range} part={null} tone="muted" inline density={density}>
      <kit.KitGrid columns={3} density={density}>{performanceRanges.map((range) => <kit.KitContent key={range}>
        {range === live.range && <kit.KitSkeleton shape="control" inset="none" kind="secondary" label={words.ranges[range]} full />}
      </kit.KitContent>)}</kit.KitGrid></kit.KitRow>
      : state !== "error" && <kit.KitTrack look="segments" part="range" role="radiogroup" label={words.range}>
        {performanceRanges.map((range) => <kit.KitChip key={range} item={null} look="segment" role="radio"
          value={range} label={words.ranges[range]} on={range === live.range} />)}
      </kit.KitTrack>}
    {state === "error" ? <kit.KitText part="notice" tone="muted">{words.error}</kit.KitText> :
      state === "empty" ? <kit.KitEmpty part="notice" decorativeIcon /> : <>
        {point && <PerformanceFigures {...{ point, density, loading }} {...(selected ? { item: selected.id } : {})} full={detail === "full"} />}
        <PerformancePlot {...{ samples, loading, density }} selected={selected?.id} />
      </>}
  </kit.KitCard>;
}
