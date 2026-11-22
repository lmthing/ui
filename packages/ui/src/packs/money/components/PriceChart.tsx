import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  variantProps,
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
  useVariant,
} from "../../../kit";
import {
  priceChartCopy,
  priceChartPoints,
  priceChartReading,
  priceChartRange,
  priceChartRanges,
} from "../copy";
import { moneyWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-PriceChart.generated";

// Core first: Sparkline/default cannot show a holding's full price history with selectable time ranges.
export const meta = {
  id: "PriceChart",
  status: "ready",
  group: "data",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "Prices fetched from a market data service.",
  variants: { detail: ["full", "brief"], emphasis: ["normal", "quiet"], surface: ["card", "outlined"] },
  variantParts: { "detail.brief": { hides: ["change"] } },
  parts: ["root", "name", "price", "change", "line", "range"],
  states: ["filled", "loading"],
  actions: { parts: { range: ["select"] } },
  read: (input, state, lang): string[] => {
    const { points, detail } = input as z.output<typeof props>;
    return state === "filled" ? priceChartReading(points, lang, detail) : [];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
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

const ledgeHolding = {
  name: "Ledge savings holding",
  points: [98, 99, 98.5, 100, 101, 100.5, 102, 103],
  range: "month",
} satisfies z.input<typeof props>;
export const examples = [
  ledgeHolding,
  { name: "Trot rainy-day holding", points: [24, 23, 24.5, 25, 24, 26, 25.5, 27], range: "year" },
  { ...ledgeHolding, detail: "brief" },
  { ...ledgeHolding, emphasis: "quiet" },
  { ...ledgeHolding, surface: "outlined" },
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
  {
    ...write(
      "Chart Green Fund over the week with prices 98, 99, 100, 102, 101, 104, 105 and 106. Show the latest price but omit the change since the start.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Select the week price range", { address: "p1/range", action: "select" }),
] satisfies Probe[];

type ChartProps = Props<typeof props, typeof meta>;
function PriceSummary({ name, points, detail, emphasis }: ChartProps) {
  const { lang } = useWords(moneyWordsFor);
  const state = useComponentState();
  const copy = priceChartCopy(points, lang);
  const numberScale = emphasis === "quiet" ? "compact" : "display";
  const change = detail === "full" ? copy.change : undefined;
  return state === "loading" ? (
    <KitSkeleton
      rows={1}
      shape="figure"
      inset="none"
      emphasis={emphasis}
      content={[
        ["label", name],
        ["number", copy.price, "start", numberScale],
        ["label", change],
      ]}
    />
  ) : (
    <KitContent>
      <KitText role="label" part="name" tone="muted" lines={1}>
        {name}
      </KitText>
      <KitText emphasis={emphasis} numberScale={numberScale} role="number" part="price" lines={1} tabular>
        {copy.price}
      </KitText>
      {change && (
        <KitText role="label" part="change" tone="muted" lines={1} tabular>
          {change}
        </KitText>
      )}
    </KitContent>
  );
}

export function PriceChart(input: ChartProps) {
  const { points, range, surface } = input;
  const emphasis = useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const { lang, words } = useWords(moneyWordsFor);
  const { priceChart: labels } = words;
  const loading = useComponentState() === "loading";
  const { screen, component } = usePartContext();
  const live = useControlValue<unknown>(`${screen}/${component}/range`, range);
  const selected = priceChartRange(live, range, lang);
  const samples = priceChartPoints(points, lang);
  const plotPoints = loading ? samples.map((point) => ({ ...point, value: null })) : samples;

  return (
    <KitCard padded part="root" surface={surface}>
      <PriceSummary {...input} emphasis={emphasis} />
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
