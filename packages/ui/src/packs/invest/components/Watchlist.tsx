import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { watchlistQuote, watchlistReading } from "../copy";
import { investWordsFor } from "../lang";
import { dateTime, distinct, recordId, seedAssets, seedTime } from "../seeds";
import { prompt } from "../../../entry/prompt-Watchlist.generated";

// Core first: List/value shows saved names and values, not dated prices against watch thresholds.
export const meta = {
  id: "Watchlist",
  status: "ready",
  group: "data",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "On-device watch records and dated quotes are independent of owned positions and shared quote history, and a live feed is optional.",
  variants: { density: ["comfortable", "compact"], detail: ["brief", "full"] },
  variantParts: { "detail.full": { adds: ["target", "gap"] } },
  parts: ["root", "refresh", "refresh_label", "notice"],
  items: {
    key: "items",
    parts: ["root", "name", "symbol", "price", "quoted_at", "target", "gap", "remove", "remove_icon"],
  },
  confirmParts: ["remove"],
  partTiers: { refresh: "service" },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { refresh: ["press"] },
    items: { root: ["press"], remove: ["press"] },
    when: { root: { linked: true }, refresh: { quote_service: true } },
    noGoto: { items: ["remove"] },
  },
  errorActions: ["refresh.press"],
  read: (input, state, lang): string[] =>
    state === "filled" ? watchlistReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;

const item = z
  .strictObject({
    assetId: recordId.meta({ kind: undefined }),
    name: c.text(32),
    symbol: c.text(12),
    price: z.number().nonnegative(),
    quotedAt: dateTime,
    target: z.number().positive().optional(),
    direction: z.enum(["at_or_below", "at_or_above"]).optional(),
    goto: c.screenId.optional(),
  })
  .refine(({ target, direction }) => direction === undefined || target !== undefined, {
    path: ["direction"],
  });

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    items: z.array(item).min(1).max(6),
  })
  .refine(({ items }) => distinct(items, ({ assetId }) => assetId), { path: ["items"] })
  .overwrite((input) => ({
    ...input,
    items: input.items.map((row) => ({
      ...row,
      linked: Boolean(row.goto),
      direction: row.target === undefined ? undefined : (row.direction ?? "at_or_below"),
    })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { items: seedAssets(input, 3).map((asset) => ({ ...asset, price: 0, quotedAt: seedTime })) };
}

// prettier-ignore
export const examples = [
  {
    items: [
      { assetId: "income_fund", name: "Income Fund", symbol: "IFD",
        price: 55, quotedAt: "2026-03-01T16:00:00Z", goto: "income_fund" },
    ],
  },
  {
    detail: "full",
    density: "compact",
    items: [
      { assetId: "short_bonds", name: "Short Bond Fund", symbol: "SBF",
        price: 55, quotedAt: "2026-03-01T16:00:00Z", target: 50 },
      { assetId: "north_equity", name: "North Equity Fund", symbol: "NEF",
        price: 77, quotedAt: "2026-03-01T16:00:00Z", target: 75, direction: "at_or_above" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Watchlist");
const brief =
  "I am watching Income Fund (income_fund, IFD), not owning it. It was quoted at 55 on 2026-03-01T16:00:00Z. I want to watch for a price of 50 or less.";
export const probes = [
  choose(
    "Compare the dated quotes of several stocks I'm watching against my own price thresholds and show the gaps. I don't own the stocks.",
  ),
  choose("Keep a simple list of three tappable favourite fund names, with no quotes or thresholds.", "List"),
  write(brief),
  {
    ...write(`${brief} Show the threshold and signed gap beside the quote.`),
    variant: { axis: "detail", value: "full" },
  },
  read("Remove Income Fund from the watched names, rather than opening it.", {
    address: "w1/r1/remove",
    action: "press",
  }),
] satisfies c.Probe[];

// prettier-ignore
export function bindWatchlist(hasQuoteService: (instance: string) => boolean): c.Definition {
  const live = { derive: (_input: Readonly<c.Values>, id: string) => ({ quote_service: hasQuoteService(id) }) };
  return { props, fallback, examples, probes, meta: { ...meta, live } };
}
type WatchProps = c.Props<typeof props, typeof meta>;
type WatchRow = WatchProps["items"][number];
type Density = NonNullable<WatchProps["density"]>;
// prettier-ignore
function ThresholdLine({ threshold, density }: { threshold: NonNullable<ReturnType<typeof watchlistQuote>["threshold"]>; density: Density }) {
  const figure = { role: "number", numberScale: "compact", emphasis: "quiet", density: "compact", tabular: true } as const;
  const tone = threshold.met ? "good" : "muted";
  return <kit.KitGrid density={density}>
    <kit.KitText part="target" role="caption" tone="muted">{threshold.lead}
      <kit.KitText part={null} {...figure} tone="text">{threshold.amount}</kit.KitText>
    </kit.KitText>
    <kit.KitText part="gap" role="caption" tone={tone}>
      <kit.KitText part={null} {...figure} tone={threshold.met ? "good" : "text"}>{threshold.change}</kit.KitText>
      {threshold.tail}
    </kit.KitText>
  </kit.KitGrid>;
}

// prettier-ignore
function QuoteRow({ row, detail, density, state }: { row: WatchRow; detail: WatchProps["detail"]; density: Density; state: c.StateName }) {
  const context = kit.usePartContext();
  const { words: { watchlist }, lang } = kit.useWords(investWordsFor);
  const { price, date, threshold } = watchlistQuote(row, detail, lang);
  const active = state === "filled", loading = state === "loading";
  const pricePart = loading
    ? <kit.KitSkeleton shape="figure" inset="none" content={[["number", price, "end", "compact"]]} />
    : <kit.KitText part="price" role="number" numberScale="compact" tabular lines={1}>{price}</kit.KitText>;
  const remove = <kit.KitRow label={row.name} inline leadingWidth="avatar" leading={<>
    {(active || loading) && <kit.KitAction part="remove" kind="quiet" icon="close" a11y={watchlist.remove(row.name)} />}
  </>}>{null}</kit.KitRow>;
  const trail = <kit.KitRow label={price} inline trailing={remove}>{pricePart}</kit.KitRow>;
  return <kit.PartContext.Provider value={{ ...context, item: row.id }}>
    <kit.KitRow part={null} density={density} label={row.name} inset="none">
      <kit.KitContent density={density}>
      <kit.KitRow part={null} density={density} label={row.name} inline trailing={trail}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[
        ["label", row.name], ["caption", [row.symbol, date].join(watchlist.identitySeparator)],
      ]} /> : <kit.KitRow item={row.id} label={row.name} goto={active ? row.goto : undefined} inline density={density}>
        <kit.KitContent density={density}>
          <kit.KitText part="name" role="label">{row.name}</kit.KitText>
          <kit.KitText part={null} role="caption" tone="muted">
            <kit.KitText part="symbol" role="caption" tone="muted">{row.symbol}</kit.KitText>
            {watchlist.identitySeparator}
            <kit.KitText part="quoted_at" role="caption" tone="muted">{date}</kit.KitText>
          </kit.KitText>
        </kit.KitContent>
      </kit.KitRow>}
      </kit.KitRow>
      {threshold && (loading ? <kit.KitGrid density={density}>
        <kit.KitSkeleton shape="figure" inset="none" content={[["caption", threshold.target]]} />
        <kit.KitSkeleton shape="figure" inset="none" content={[["caption", threshold.gap]]} />
      </kit.KitGrid> : <ThresholdLine {...{ threshold, density }} />)}
      </kit.KitContent>
    </kit.KitRow>
  </kit.PartContext.Provider>;
}

// prettier-ignore
export function Watchlist(input: WatchProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { quote_service } = kit.useLiveControls(meta, input);
  const { words: { watchlist } } = kit.useWords(investWordsFor);
  const failed = state === "error";
  const empty = state === "empty" || state === "success" || !input.items.length;
  const rows = input.items.map((row) => <QuoteRow key={row.id} {...{ row, detail, density, state }} />);
  const refresh = quote_service === true && (state === "filled" || failed);
  return <kit.KitCard part="root" density={density} padded={!empty}>
    <kit.KitState part="notice" retain={failed} loading={rows} density={density}
      message={failed ? watchlist.refreshFailed : state === "success" ? watchlist.removed : undefined}>
      {rows}
      {refresh && <kit.KitActionFooter density={density}>
        <kit.KitAction part="refresh" kind="quiet" label={watchlist.refresh} />
      </kit.KitActionFooter>}
    </kit.KitState>
  </kit.KitCard>;
}
