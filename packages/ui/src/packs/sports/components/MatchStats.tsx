import { z } from "zod";
import {
  clip,
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
  type StateName,
} from "../../../catalog";
import * as kit from "../../../kit";
import { prompt } from "../../../entry/prompt-MatchStats.generated";
import { matchStatValue, mirroredShares } from "../copy";
import { sportsWordsFor } from "../lang";

// Core first: Bars (single series) cannot show both teams' values on each metric's mirrored axis.
export const meta = {
  id: "MatchStats",
  status: "ready",
  group: "data",
  tier: "phone",
  pick: prompt.pick,
  purpose: prompt.purpose,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  realPath:
    "match stat totals aggregated from recorded match events on the device or fetched from a sports data service.",
  dense: true,
  variants: { detail: ["full", "brief"] },
  parts: ["root", "period"],
  selections: { period: { prop: "periodAt", choices: { prop: "periodOptions" }, runtime: true } },
  actions: { parts: { period: ["select"] }, when: { period: { hasPeriods: true } } },
  states: ["filled", "empty", "loading"],
  read: readStats,
} as const satisfies Meta;

const values = {
  homeValue: z.number().min(0),
  awayValue: z.number().min(0),
};

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    home: text(20),
    away: text(20),
    periods: z.array(text(12)).min(0).max(5),
    periodAt: z.int().min(0).max(4).default(0),
    metrics: z
      .array(
        z.strictObject({
          label: text(24),
          ...values,
          unit: z.enum(["count", "percent"]).default("count"),
          periodValues: z.array(z.strictObject(values)).min(1).max(4).optional(),
        }),
      )
      .min(2)
      .max(10),
  })
  .refine(({ periods, periodAt }) => periodAt < Math.max(1, periods.length), {
    path: ["periodAt"],
    message: "Select a supplied period",
  })
  .refine(({ periods }) => new Set(periods).size === periods.length, {
    path: ["periods"],
    message: "Period labels must be distinct",
  })
  .refine(
    ({ periods, metrics }) =>
      metrics.every(({ periodValues }) => !periodValues || periodValues.length === periods.length - 1),
    {
      path: ["metrics"],
      message: "Supply one comparison for each period other than periodAt",
    },
  )
  .overwrite((input) => ({
    ...input,
    seedPeriodAt: input.periodAt,
    hasPeriods: input.periods.length > 0,
    periodOptions: input.periods.map((label, value) => ({ label, value })),
  }));

type MatchStatsProps = Props<typeof props, typeof meta>;
type Metric = MatchStatsProps["metrics"][number];

function activeMetrics({ metrics, periods }: MatchStatsProps, selected: number, initial: number): Metric[] {
  if (!periods[selected] || selected === initial) return metrics;
  const index = selected < initial ? selected : selected - 1;
  const slice = metrics.flatMap((metric) => {
    const pair = metric.periodValues?.[index];
    return pair ? [{ ...metric, ...pair }] : [];
  });
  return slice.length === metrics.length ? slice : [];
}

function readStats(raw: unknown, state: StateName, lang?: string): string[] {
  const input = raw as MatchStatsProps & { seedPeriodAt: number };
  const words = sportsWordsFor(lang).matchStats;
  if (state !== "filled") return state === "empty" ? [words.empty] : [];
  const selected = input.periods[input.periodAt] ? input.periodAt : input.seedPeriodAt;
  const active = activeMetrics(input, selected, input.seedPeriodAt);
  const period = input.periods[selected];
  return [
    words.title,
    ...(period ? [words.selectedPeriod(period)] : []),
    ...(active.length
      ? active.map(({ label, homeValue, awayValue, unit }) =>
          words.comparison(
            label,
            input.home,
            matchStatValue(homeValue, unit, lang),
            input.away,
            matchStatValue(awayValue, unit, lang),
          ),
        )
      : [words.empty]),
  ];
}

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 2);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    home: castTitle(20, 0),
    away: castTitle(20, 1),
    periods: [],
    metrics: Array.from({ length: 2 }, (_, index) => ({
      label: castTitle(24, index),
      homeValue: 0,
      awayValue: 0,
    })),
  };
}

export const examples = [
  {
    home: "Sunday Kickers",
    away: "River Rovers",
    periods: ["Full match", "First half"],
    metrics: [
      {
        label: "Possession",
        homeValue: 58,
        awayValue: 42,
        unit: "percent",
        periodValues: [{ homeValue: 46, awayValue: 54 }],
      },
      { label: "Shots", homeValue: 13, awayValue: 8, periodValues: [{ homeValue: 5, awayValue: 6 }] },
      {
        label: "Shots on target",
        homeValue: 4,
        awayValue: 4,
        periodValues: [{ homeValue: 2, awayValue: 3 }],
      },
    ],
  },
  {
    home: "Oakfield",
    away: "Fern House",
    periods: [],
    detail: "brief",
    metrics: [
      { label: "Shots on target", homeValue: 4, awayValue: 6 },
      { label: "Fouls", homeValue: 8, awayValue: 8 },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("MatchStats");
export const probes = [
  choose(
    "For today's football match put both teams' possession, shots and fouls side by side, with a paired bar for each statistic.",
  ),
  choose(
    "Chart a single series of daily walks, one bar per day, without any other team or series to compare.",
    "Bars",
  ),
  write(
    "Compare Sunday Kickers and River Rovers for the whole match: possession 58% to 42% and shots 13 to 8. There are no period filters.",
  ),
  {
    ...write(
      "Compare Oakfield and Fern House in a simple numbers-only list without bar tracks. Shots on target: 4 and 6. Fouls: 8 each. No period filters.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Switch the comparison to the first half.", { address: "c1/period", action: "select" }),
] satisfies Probe[];

function MatchMetric({
  metric,
  brief,
  loading,
  lang,
}: {
  metric: Metric;
  brief: boolean;
  loading: boolean;
  lang: string;
}) {
  const { homeValue, awayValue, label, unit } = metric;
  const [homeRatio, awayRatio] = mirroredShares(homeValue, awayValue);
  const figure = (value: number, other: number) => ({
    text: matchStatValue(value, unit, lang),
    role: "figure" as const,
    compact: true,
    tabular: true,
    tone: value > other ? ("accent" as const) : ("muted" as const),
  });
  const labelLine = { text: label, role: "meta" } as const;
  const homeLine = figure(homeValue, awayValue);
  const awayLine = figure(awayValue, homeValue);
  if (brief)
    return (
      <kit.KitGrid columns={3}>
        <kit.KitLayoutText line={labelLine} />
        <MetricFigure line={homeLine} />
        <MetricFigure line={awayLine} />
      </kit.KitGrid>
    );
  return (
    <kit.KitContent rhythm="flush">
      <kit.KitLayoutText line={labelLine} align="center" />
      <kit.KitGrid>
        <MetricSide line={homeLine} ratio={loading ? 0 : homeRatio} home />
        <MetricSide line={awayLine} ratio={loading ? 0 : awayRatio} />
      </kit.KitGrid>
    </kit.KitContent>
  );
}

function MetricFigure({ line }: { line: kit.LayoutLine }) {
  return (
    <kit.KitGrid columns={3}>
      <></>
      <kit.KitLayoutText line={line} align="end" />
    </kit.KitGrid>
  );
}

function MetricSide({ line, ratio, home = false }: { line: kit.LayoutLine; ratio: number; home?: boolean }) {
  return (
    <kit.KitContent rhythm="flush">
      <MetricFigure line={line} />
      <kit.KitMeter
        label=""
        amount=""
        ratio={ratio}
        fillFrom={home ? "end" : "start"}
        slim
        addressed={false}
      />
    </kit.KitContent>
  );
}

function TeamHeadings({ home, away, brief }: { home: string; away: string; brief: boolean }) {
  return (
    <kit.KitGrid columns={brief ? 3 : 2}>
      {brief && <></>}
      <kit.KitLayoutText line={{ text: home, role: "meta", strong: true }} align="center" />
      <kit.KitLayoutText line={{ text: away, role: "meta", strong: true }} align="center" />
    </kit.KitGrid>
  );
}

export function MatchStats(input: MatchStatsProps) {
  const {
    words: { matchStats: words },
    lang,
  } = kit.useWords(sportsWordsFor);
  const loading = kit.useComponentState() === "loading";
  const { screen, component } = kit.usePartContext();
  const selected = kit.useControlValue(`${screen}/${component}/$selection/periodAt`, input.periodAt);
  const periodAt = input.periods[selected] ? selected : input.periodAt;
  const brief = kit.useVariant("detail", meta.variants.detail, input.detail) === "brief";
  const metrics = activeMetrics(input, periodAt, input.periodAt);
  const body = (
    <>
      <kit.KitHeader title={{ text: words.title }} />
      {input.periods.length > 0 && (
        <kit.KitTrack part="period" role="radiogroup" label={words.period}>
          {input.periods.map((label, value) => (
            <kit.KitChip
              key={value}
              item={null}
              role="radio"
              label={label}
              on={periodAt === value}
              disabled={loading ? false : undefined}
            />
          ))}
        </kit.KitTrack>
      )}
      {metrics.length > 0 ? (
        <>
          <TeamHeadings home={input.home} away={input.away} {...{ brief }} />
          <kit.KitRowGroup spacing="groups" separators={false}>
            {metrics.map((metric, index) => (
              <MatchMetric key={index} {...{ metric, brief, loading, lang }} />
            ))}
          </kit.KitRowGroup>
        </>
      ) : (
        <kit.KitEmpty title={words.empty} part={null} prominence="body" />
      )}
    </>
  );
  return (
    <kit.KitCard part="root" padded>
      <kit.KitState message={words.empty} loading={body}>
        {body}
      </kit.KitState>
    </kit.KitCard>
  );
}
