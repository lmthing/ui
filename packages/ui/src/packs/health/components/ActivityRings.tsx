import { z } from "zod";
import {
  goalLine,
  numberLine,
  placeholderValue,
  probesFor,
  text,
  variantProps,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitCard,
  KitGrid,
  KitRadialTrack,
  KitRow,
  KitSkeleton,
  KitText,
  useWords,
  useComponentState,
  useVariant,
} from "../../../kit";
import { activityRingLine, activityScoreLine, activityScoreMax } from "../copy";
import { seedTitles } from "..";
import { prompt } from "../../../entry/prompt-ActivityRings.generated";

// Core first: Progress/ring cannot show two or three independently filled concentric daily goals.
export const meta = {
  id: "ActivityRings",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 2,
  tier: "phone",
  signature: "ring_fill",
  realPath: "Totals stored on the device; phone health-store or watch imports need read permission.",
  writeHints: prompt.writeHints,
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["of"] } },
  items: { key: "rings", parts: ["root", "label", "value", "of", "unit"] },
  parts: ["root", "rings", "score", "score_label"],
  states: ["filled", "loading"],
  read: (input, state, lang?: string): string[] => {
    const { rings, detail, score } = input as z.output<typeof props>;
    return state === "filled"
      ? [
          ...(score ? [activityScoreLine(score, lang)] : []),
          ...rings.map((ring) => activityRingLine(ring, lang, detail !== "brief")),
        ]
      : [];
  },
} as const satisfies Meta;
// prettier-ignore
export const props = z.strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["rings", "score"]).default("rings"),
    score: z.strictObject({ label: text(16), value: z.int().min(0).max(activityScoreMax) }).optional(),
    rings: z.array(z.strictObject({
      label: text(16), value: z.number().min(0).max(1000000),
      of: z.number().positive().max(1000000), unit: text(8),
    })).min(2).max(3),
  }).refine(({ style, score, rings }) => style === "score" ? score !== undefined && rings.length === 3 : score === undefined, {
    path: ["score"], message: "Score style requires a headline score and exactly three factor rings.",
  });
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const titles = seedTitles(cast, 2, 16);
  return {
    rings: [0, 1].map((index) => ({
      label: titles[index % titles.length]!,
      value: 0,
      of: 1,
      unit: placeholderValue,
    })),
  };
}
export const examples = [
  {
    rings: [
      { label: "Watered", value: 3, of: 5, unit: "plants" },
      { label: "Fed", value: 2, of: 4, unit: "plants" },
      { label: "Pruned", value: 1, of: 3, unit: "plants" },
    ],
  },
  {
    rings: [
      { label: "Walks", value: 9, of: 12, unit: "walks" },
      { label: "Active", value: 45, of: 60, unit: "min" },
    ],
  },
  {
    rings: [
      { label: "Move", value: 280, of: 400, unit: "kcal" },
      { label: "Exercise", value: 20, of: 30, unit: "min" },
      { label: "Stand", value: 7, of: 12, unit: "hours" },
    ],
  },
  {
    rings: [
      { label: "Steps", value: 8500, of: 8000, unit: "steps" },
      { label: "Water", value: 5, of: 8, unit: "glasses" },
    ],
  },
  {
    style: "score",
    score: { label: "Readiness", value: 82 },
    rings: [
      { label: "Sleep", value: 8, of: 10, unit: "pts" },
      { label: "Recovery", value: 9, of: 10, unit: "pts" },
      { label: "Activity", value: 7, of: 10, unit: "pts" },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write } = probesFor("ActivityRings");
export const probes = [
  choose(
    "Show move, exercise and stand as three concentric daily rings, each with a separate value and goal",
  ),
  choose("Show just one circular daily step goal, 3000 of 8000, no other goals", "Progress"),
  write("Three daily goals: Move 280 of 400 kcal, Exercise 20 of 30 min, Stand 7 of 12 hours"),
  {
    ...write(
      "Show two daily goals as rings: Move 280 of 400 kcal and Exercise 20 of 30 min. Keep the target numbers in the data for the rings, but hide the target captions.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  {
    ...write(
      "Show my Readiness score of 82 out of 100 as the headline ring, with three surrounding factor rings: Sleep 8 of 10 pts, Recovery 9 of 10 pts, Activity 7 of 10 pts.",
    ),
    fields: { style: "score", "score.value": 82 },
  },
] satisfies Probe[];

const ringTones = ["accent", "good", "warn"] as const;
const scoreTones = ["accent", "warn", "muted"] as const;
const numberScaleOf = (value: number, count: number) =>
  value >= (count === 3 ? 1000 : 10000) ? ("compact" as const) : ("display" as const);

const ringNumber = (value: number, count: number) =>
  ({ role: "number", align: "center", tabular: true, numberScale: numberScaleOf(value, count) }) as const;

function ScoreCaption({ label, loading }: { label: string; loading: boolean }) {
  if (loading)
    return (
      <KitSkeleton shape="figure" inset="none" lines={[{ text: label, role: "caption", align: "center" }]} />
    );
  return (
    <KitText part="score_label" role="label" align="center">
      {label}
    </KitText>
  );
}
type TrackProps = Pick<Props<typeof props, typeof meta>, "rings" | "score"> & {
  loading: boolean;
  lang: string;
};
function RingTrack({ rings, score, loading, lang }: TrackProps) {
  const tracks = rings.map((ring, index) => ({
    id: ring.id,
    ratio: ring.value / ring.of,
    tone: (score ? scoreTones : ringTones)[index]!,
  }));
  const tracksWithScore = score
    ? [...tracks, { id: "score", ratio: score.value / activityScoreMax, tone: "text" as const }]
    : tracks;
  return (
    <>
      {score && <ScoreCaption label={score.label} loading={loading} />}
      <KitRadialTrack part="rings" style="rings" loading={loading} rings={tracksWithScore}>
        {score && (
          <>
            <KitText part="score" role="number" align="center" tabular>
              {numberLine(score.value, lang)}
            </KitText>
            <KitText part={null} role="caption" tone="muted" align="center">
              {goalLine(activityScoreMax, lang)}
            </KitText>
          </>
        )}
      </KitRadialTrack>
    </>
  );
}

function RingPlaceholder(
  ring: Props<typeof props, typeof meta>["rings"][number],
  count: number,
  score: Props<typeof props, typeof meta>["score"],
  full: boolean,
  lang: string,
) {
  return (
    <KitSkeleton
      key={ring.id}
      shape="figure"
      inset="none"
      lines={[
        { text: ring.label, role: "caption", align: "center" },
        {
          text: numberLine(ring.value, lang),
          role: "number",
          align: "center",
          numberScale: score ? "compact" : numberScaleOf(ring.value, count),
        },
        {
          text: full ? `${goalLine(ring.of, lang)} ${ring.unit}` : ring.unit,
          role: "caption",
          align: "center",
        },
      ]}
    />
  );
}

function RingFigures(
  rings: Props<typeof props, typeof meta>["rings"],
  score: Props<typeof props, typeof meta>["score"],
  full: boolean,
  loading: boolean,
  lang: string,
) {
  return (
    <KitGrid columns={rings.length === 2 ? 2 : 3}>
      {rings.map((ring, index) =>
        loading ? (
          RingPlaceholder(ring, rings.length, score, full, lang)
        ) : (
          <KitRow key={ring.id} item={ring.id} label={ring.label} inline inset="none">
            <KitText
              role="caption"
              tone={(score ? scoreTones : ringTones)[index]!}
              align="center"
              part="label"
            >
              {ring.label}
            </KitText>
            <KitText
              {...ringNumber(ring.value, rings.length)}
              {...(score && { numberScale: "compact", emphasis: "hero" })}
              part="value"
            >
              {numberLine(ring.value, lang)}
            </KitText>
            {full ? (
              <KitText role="caption" tone="muted" align="center" part="of">
                {goalLine(ring.of, lang)}
                {"\u00a0"}
                <KitText role="caption" tone="muted" part="unit">
                  {ring.unit}
                </KitText>
              </KitText>
            ) : (
              <KitText role="caption" tone="muted" align="center" part="unit">
                {ring.unit}
              </KitText>
            )}
          </KitRow>
        ),
      )}
    </KitGrid>
  );
}

export function ActivityRings({ rings, score, detail }: Props<typeof props, typeof meta>) {
  const surface = "card";
  const full = useVariant("detail", meta.variants.detail, detail) === "full";
  const { lang } = useWords();
  const loading = useComponentState() === "loading";
  return (
    <KitCard style="inset" part="root" padded surface={surface}>
      <RingTrack rings={rings} score={score} loading={loading} lang={lang} />
      {RingFigures(rings, score, full, loading, lang)}
    </KitCard>
  );
}
