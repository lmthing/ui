import { z } from "zod";
import { itemsOf, placeholderTitle, probesFor, text, thingOf, titleOf, variantProps } from "../../../catalog";
import type { FallbackInput, Meta, Probe, Props } from "../../../catalog";
import * as kit from "../../../kit";
import { chartPoints, chartTicks, pointReading, pointValue, seriesId, seriesTones } from "../copy";
import { dataWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-LineChart.generated";

// Core first: Sparkline/default shows one compact trend, not labelled, selectable points from several series.
export const meta = {
  id: "LineChart",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Values aggregated from records on the device.",
  variants: {
    density: ["comfortable", "compact"],
    detail: ["full", "brief"],
    surface: ["card", "outlined"],
  },
  variantParts: { "detail.brief": { hides: ["latest"] } },
  parts: ["root", "title", "axes", "unit", "latest", "reading", "points", "series_1", "series_2", "series_3"],
  items: { key: "points", parts: ["root"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["select"] } },
  select: { prop: "point", value: "index" },
  live: { derive: (input): Record<string, unknown> => ({ points: chartPoints(input as ChartInput) }) },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const chart = input as ChartInput;
    const points = chartPoints(chart);
    return [
      ...(chart.detail === "full" ? [dataWordsFor(lang).chartLatest] : []),
      ...(chart.unit ? [dataWordsFor(lang).chartUnit(chart.unit)] : []),
      ...chartTicks(points, lang),
      ...points.map((point) => pointReading(point, chart.unit, lang)),
    ];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    title: text(32),
    unit: text(8).optional(),
    labels: z.array(text(6)).min(4).max(31),
    series: z
      .array(z.strictObject({ label: text(16), values: z.array(z.number()).min(4).max(31) }))
      .min(1)
      .max(3),
  })
  .refine(({ labels, series }) => series.every(({ values }) => values.length === labels.length), {
    path: ["series"],
    message: "Write one value for every label, in label order",
  })
  .overwrite((input) => ({ ...input, points: chartPoints(input) }));

type ChartInput = z.output<typeof props>;

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 4, thing?.type);
  const title = items[0] && titleOf(items[0], 32, thing);
  const labels = Array.from({ length: 4 }, (_, i) => {
    const item = items[i];
    return (item && titleOf(item, 6, thing)) || dataWordsFor(lang).chartPlaceholder(i);
  });
  return {
    title: title || placeholderTitle(0, lang),
    labels,
    series: [{ label: placeholderTitle(1, lang), values: labels.map(() => 0) }],
  };
}

export const examples = [
  {
    title: "Watering by week",
    unit: "visits",
    labels: ["Nov 2", "Nov 9", "Nov 16", "Nov 23"],
    series: [
      { label: "Ferns", values: [2, 3, 4, 6] },
      { label: "Succulents", values: [1, 0, 2, 1] },
    ],
  },
  {
    title: "Walks this week",
    unit: "walks",
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    series: [
      { label: "Canal loop", values: [6, 8, 7, 5, 8] },
      { label: "Park loop", values: [4, 3, 5, 7, 6] },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("LineChart");
export const probes = [
  choose(
    "Draw two lines across twelve monthly ticks so I can compare how the two series track each other. Let me tap a point to read its value.",
  ),
  choose(
    "Under one large 18, add a tiny unlabelled trend for 11, 13, 15, 18. No axes or second series.",
    "Sparkline",
  ),
  write(
    "Show Watering by week in visits for Nov 2, Nov 9, Nov 16, Nov 23. Plot Ferns at 2, 3, 4, 6 and Succulents at 1, 0, 2, 1.",
  ),
  {
    ...write(
      "Chart Canal and Park walks from Mon to Thu. Canal: 6, 8, 7, 5; Park: 4, 3, 5, 7. Keep the axes and tappable dates, but leave out the latest-value summary.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Select the Ferns point on Nov 9.", { address: "s1/r2", action: "select" }),
] satisfies Probe[];

type ChartProps = Props<typeof props, typeof meta>;
type Point = ReturnType<typeof chartPoints>[number];
// prettier-ignore
function ChartLatest({ series, density, loading }: Pick<ChartProps, "series" | "density"> & { loading: boolean }) {
  const { words, lang } = kit.useWords(dataWordsFor);
  const summary = <kit.KitGrid columns={series.length === 3 ? 3 : 2} density={density}>
    {series.map(({ label, values }, index) => {
      const value = pointValue(values.at(-1)!, undefined, lang);
      return loading
      ? <kit.KitSkeleton key={index} shape="figure" inset="none" density={density}
          content={[["caption", label], ["number", value]]} />
      : <kit.KitContent key={index} density={density}>
          <kit.KitText role="caption" tone={seriesTones[index]!} part={null} lines={1}>{label}</kit.KitText>
          <kit.KitText role="number" part={null} density={density} tabular lines={1}>{value}</kit.KitText>
        </kit.KitContent>; })}
  </kit.KitGrid>;
  const caption = loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
    content={[["caption", words.chartLatest]]} /> : <kit.KitText part="latest" role="caption" tone="muted">{words.chartLatest}</kit.KitText>;
  return <kit.KitContent density={density}>{caption}{summary}</kit.KitContent>;
}

// prettier-ignore
function ChartControls({ points, selected, title, loading }: { points: Point[]; selected?: Point | undefined; title: string; loading: boolean }) {
  const { words } = kit.useWords(dataWordsFor);
  const tracks = points.filter(({ x }) => x === 0).map(({ series, line }) => {
    const dates = points.filter((point) => point.line === line);
    const buttons = <kit.KitGrid columns={dates.length === 4 ? 2 : 3}>
      {dates.map(({ id, label }) => <kit.KitChip key={id} item={id} role="radio" look="box" labelPart={null}
        label={label} on={selected?.id === id} />)}
    </kit.KitGrid>;
    return (
    <kit.KitContent key={seriesId(line)} group={line ? "response" : "content"}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["caption", series]]} /> :
        <kit.KitText role="caption" tone={seriesTones[line]!} part={null}>{series}</kit.KitText>}
      {loading ? buttons : <kit.KitTrack part={`series_${line + 1}`} role="radiogroup" label={words.chartSeriesPoints(series)}>{buttons}</kit.KitTrack>}
    </kit.KitContent>
  ); });
  return loading ? <kit.KitContent>{tracks}</kit.KitContent> : points.length > 12
    ? <kit.KitScroll part="points" label={words.chartPoints(title)}>{tracks}</kit.KitScroll>
    : <kit.KitRow part="points" inline role="group" label={words.chartPoints(title)}>{tracks}</kit.KitRow>;
}

// prettier-ignore
export function LineChart(input: ChartProps) {
  const { title, unit } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const { words, lang } = kit.useWords(dataWordsFor);
  const unitLabel = unit ? words.chartUnit(unit) : undefined;
  const state = kit.useComponentState(), loading = state === "loading";
  const { screen, component } = kit.usePartContext();
  const at = kit.useControlValue<number | undefined>(`${screen}/${component}/$point`, undefined);
  const points = chartPoints(input);
  const selected = Number.isInteger(at) && at! >= 0 ? points[at!] : undefined;
  const series = input.series.map((_, line) => ({
    id: seriesId(line), label: "", tone: seriesTones[line]!,
    points: points.filter((point) => point.line === line),
  }));
  if (state === "empty") return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitEmpty part="title" decorativeIcon />
  </kit.KitCard>;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {loading ? <kit.KitSkeleton rows={1} shape="figure" inset="none" density={density} content={[["heading", title]]} /> :
      <kit.KitText part="title" role="heading" density={density}>{title}</kit.KitText>}
    {full && <ChartLatest {...{ ...input, density, loading }} />}
    {unitLabel && (loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["caption", unitLabel]]} /> :
      <kit.KitText part="unit" role="caption" tone="muted">{unitLabel}</kit.KitText>)}
    <kit.KitLinePlot part="axes" loading={loading} series={series}
      {...(selected && !loading ? { selected: selected.id } : {})} />
    {!loading && selected && <kit.KitText part="reading" role="label" tabular>
      {words.chartSelected(selected.series, selected.label, pointValue(selected.value, unit, lang))}
    </kit.KitText>}
    <ChartControls {...{ points, selected, title, loading }} />
  </kit.KitCard>;
}
