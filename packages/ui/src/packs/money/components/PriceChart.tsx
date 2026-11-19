import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitCard,
  KitChip,
  KitContent,
  KitLinePlot,
  KitSkeleton,
  KitText,
  KitTrack,
  useComponentState,
  useControlValue,
  usePartContext,
  useWords,
} from "../../../kit";
import {
  priceChartCopy,
  priceChartPoints,
  priceChartReading,
  priceChartRange,
  priceChartRanges,
} from "../copy";
import { moneyWordsFor } from "../lang";

// Core first: Sparkline/default cannot show a holding's full price history with selectable time ranges.
export const meta = {
  id: "PriceChart",
  status: "ready",
  group: "data",
  purpose: "See how one holding's price moved over a chosen period.",
  pick: "A holding's price history with selectable day, week, month, year and all ranges. Not a compact recent value trend (Sparkline), one sum (Amount), personal measurements (Measurements), or a business metric (LineChart).",
  writeHints: [
    "points are 8–60 numeric prices in time order. Code derives current price and change; never write them or currency.",
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "Prices fetched from a market data service.",
  parts: ["root", "name", "price", "change", "line", "range"],
  states: ["filled", "loading"],
  actions: { parts: { range: ["select"] } },
  read: (input, state, lang) =>
    state === "filled" ? priceChartReading((input as z.output<typeof props>).points, lang) : [],
} as const satisfies Meta;

export const props = z.strictObject({
  name: text(24),
  points: z.array(z.number().nonnegative()).min(8).max(60),
  range: z.enum(priceChartRanges),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  return {
    name: (item && titleOf(item, 24, thing)) || placeholderTitle(0, lang),
    points: Array.from({ length: 8 }, () => 0),
    range: "month",
  };
}

export const examples = [
  { name: "Ledge savings holding", points: [98, 99, 98.5, 100, 101, 100.5, 102, 103], range: "month" },
  { name: "Trot rainy-day holding", points: [24, 23, 24.5, 25, 24, 26, 25.5, 27], range: "year" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("PriceChart");
export const probes = [
  choose(
    "Show one stock holding's price line with current price, change and selectable day, week, month, year and all-history ranges",
  ),
  choose(
    "Show my latest soil moisture and its short recent downward trend in a compact strip, with no time-range tabs",
    "Sparkline",
  ),
  write(
    "My Green Fund holding has monthly price samples 98, 99, 98.5, 100, 101, 100.5, 102, 103. Select the month range; derive current price and change from the samples",
  ),
  read("Select the week price range", { address: "p1/range", action: "select" }),
] satisfies Probe[];

function PriceSummary({ name, points }: Pick<Props<typeof props, typeof meta>, "name" | "points">) {
  const { lang } = useWords(moneyWordsFor);
  const state = useComponentState();
  const { price, change } = priceChartCopy(points, lang);
  return state === "loading" ? (
    <KitSkeleton
      rows={1}
      shape="figure"
      inset="none"
      content={[
        ["label", name],
        ["number", price],
        ["label", change],
      ]}
    />
  ) : (
    <KitContent>
      <KitText role="label" part="name" tone="muted" lines={1}>
        {name}
      </KitText>
      <KitText role="number" part="price" lines={1} tabular>
        {price}
      </KitText>
      <KitText role="label" part="change" tone="muted" lines={1} tabular>
        {change}
      </KitText>
    </KitContent>
  );
}

export function PriceChart({ name, points, range }: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords(moneyWordsFor);
  const { priceChart: labels } = words;
  const loading = useComponentState() === "loading";
  const { screen, component } = usePartContext();
  const live = useControlValue<unknown>(`${screen}/${component}/range`, range);
  const selected = priceChartRange(live, range, lang);
  const samples = priceChartPoints(points, lang);
  const plotPoints = loading ? samples.map((point) => ({ ...point, value: null })) : samples;

  return (
    <KitCard padded part="root">
      <PriceSummary name={name} points={points} />
      <KitLinePlot
        part="line"
        style="compact"
        loading={loading}
        series={[{ id: "price", label: labels.series, points: plotPoints }]}
      />
      <KitTrack look="segments" part="range" role="radiogroup" label={labels.ranges}>
        {priceChartRanges.map((option) => (
          <KitChip
            key={option}
            item={null}
            look="segment"
            role="radio"
            label={labels.options[option]}
            value={option}
            on={!loading && selected === option}
            disabled={loading || undefined}
          />
        ))}
      </KitTrack>
    </KitCard>
  );
}
