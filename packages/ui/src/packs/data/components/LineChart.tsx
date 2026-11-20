import { z } from "zod";
import {
  itemsOf,
  numberLine,
  placeholderTitle,
  placeholderValue,
  probesFor,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Sparkline/default shows one compact trend, not labelled, selectable points from several series.
export const meta = {
  id: "LineChart",
  status: "draft",
  group: "data",
  purpose: "Compare trends over time and inspect individual values.",
  pick: "Compare one to three time series over four or more labelled points, with labelled axes and readable points. Not a tiny trend under one headline number (Sparkline), category amounts (Bars) or a holding's price (PriceChart).",
  writeHints: [
    "Series values are numbers, one per label in the same order. Labels are at most six characters. Do not write axes, latest values, ticks or colours.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Values aggregated from records on the device.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "title", "axes", "latest"],
  items: { key: "points", parts: ["root"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["select"] } },
  select: { prop: "point", value: "index" },
  live: { derive: (input): Record<string, unknown> => ({ points: chartPoints(input as ChartInput) }) },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const chart = input as ChartInput;
    return chartPoints(chart).map(
      ({ id, series, label, value }) =>
        `${id} ${series} · ${label} · ${numberLine(value, lang)}${chart.unit ? ` ${chart.unit}` : ""}`,
    );
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
  });

type ChartInput = z.output<typeof props>;
function chartPoints(input: ChartInput) {
  return input.series.flatMap(({ label: series, values }, s) =>
    values.map((value, i) => ({
      id: `r${s * input.labels.length + i + 1}`,
      series,
      label: input.labels[i]!,
      value,
    })),
  );
}

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 4, thing?.type);
  const labels = Array.from({ length: 4 }, (_, i) => {
    const item = items[i];
    return (item && titleOf(item, 6, thing)) ?? placeholderTitle(i, lang).slice(0, 6);
  });
  return {
    title: placeholderTitle(0, lang),
    labels,
    series: [{ label: placeholderTitle(1, lang), values: labels.map(() => Number(placeholderValue)) }],
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
    density: "compact",
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
  read("Select the Ferns point on Nov 9.", { address: "s1/r2", action: "select" }),
] satisfies Probe[];
