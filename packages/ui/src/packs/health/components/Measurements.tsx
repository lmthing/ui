import {
  useWords,
  KitAction,
  KitCard,
  KitChip,
  KitContent,
  KitEmpty,
  KitLinePlot,
  KitSkeleton,
  KitText,
  KitTrack,
  useComponentState,
  useControlValue,
  usePartContext,
  useVariant,
} from "../../../kit";
import { healthWordsFor } from "../lang";
import { z } from "zod";
import {
  placeholderValue,
  probesFor,
  screenId,
  text,
  variantProps,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { seedTitles } from "..";
import {
  measurementCopy,
  measurementPoints,
  measurementRange,
  measurementRanges,
  measurementReading,
} from "../copy";

// Core first: Sparkline/default cannot show a long measurement series with a goal line and range tabs.
export const meta = {
  id: "Measurements",
  status: "ready",
  group: "data",
  purpose: "Follow a body measurement's long-term history against a goal across selectable time ranges.",
  pick: "Long body-measurement history with a dashed goal reference, latest value, change and month/quarter/year switching. Not today's weight with a tiny recent trend and no goal or range switching (Sparkline), progress toward a total (Ring), a holding's price (PriceChart), or business series (LineChart).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Measurements typed on the device; a scale or health-store import needs read permission, and is not medical advice.",
  writeHints: [
    "Leave axes null unless asked. Use detail brief to hide the change since the first reading; keep all measurement points and any supplied goal.",
  ],
  variants: { surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["change"] } },
  parts: ["root", "label", "latest", "change", "goal", "plot", "range", "add"],
  states: ["filled", "empty", "loading"],
  actions: { parts: { range: ["select"], add: ["press"] } },
  read: (input, state, lang?: string): string[] => {
    const { points, unit, goal, detail } = input as z.output<typeof props>;
    return state !== "filled" ? [] : measurementReading(points, unit, goal, lang, detail !== "brief");
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    label: text(20),
    unit: text(8),
    points: z.array(z.number().min(0).max(10000)).min(4).max(52),
    goal: z.number().min(0).max(10000).optional(),
    range: z.enum(["month", "quarter", "year"]).default("month"),
    goto: screenId.transform((goto) => ({ goto })),
  })
  // Keep navigation on its own action, not the range selector.
  .overwrite((value) => ({ ...value, add: value.goto }));
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    label: seedTitles(cast, 1, 20)[0]!,
    unit: placeholderValue,
    points: [0, 0, 0, 0],
    goto: "details",
  };
}
// prettier-ignore
export const examples = [
  {
    label: "Body weight",
    unit: "kg",
    points: [78, 77.5, 77.2, 76.8],
    goal: 75,
    range: "month",
    goto: "add_measurement",
  },
  { label: "Waist", unit: "cm", points: [90, 89, 88.5, 88, 87.5], range: "quarter", goto: "add_measurement", detail: "brief", surface: "outlined" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Measurements");
export const probes = [
  choose(
    "Track my body weight over twelve weeks with a dashed goal line, latest change and selectable month or year range",
  ),
  choose(
    "Show just today's weight and a tiny recent trend underneath, no goal line or range switching",
    "Sparkline",
  ),
  write(
    "Body weight in kg, four weekly readings 78, 77.5, 77.2, 76.8, goal 75, month range, add opens add_measurement",
  ),
  {
    ...write(
      "Track body weight in kg: 78, 77.5, 77.2 and 76.8 over four weeks, goal 75, add opens add_measurement. Show the latest reading and goal, but omit the change since the first reading.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Add a new body-weight measurement", { address: "m1/add", action: "press" }),
] satisfies Probe[];

// prettier-ignore
function MeasurementSummary({ label, copy, full }: {
  label: string; copy: ReturnType<typeof measurementCopy>; full: boolean;
}) {
  return useComponentState() === "loading" ? (
    <KitSkeleton
      rows={1}
      shape="figure"
      inset="none"
      lead="none"
      content={[
        ["label", label],
        ["label", copy.latestLabel],
        ["number", copy.latest],
        ...(full ? [["label", copy.change] as ["label", string]] : []),
        ...(copy.goal ? [["label", copy.goal] as ["label", string]] : []),
      ]}
    />
  ) : (
    <KitContent>
      <KitText role="label" tone="muted" part="label">{label}</KitText>
      <KitText role="label" tone="muted" part={null}>{copy.latestLabel}</KitText>
      <KitText role="number" part="latest" lines={1} tabular>{copy.latest}</KitText>
      {full && <KitText role="label" tone="muted" part="change" tabular>{copy.change}</KitText>}
      {copy.goal && <KitText role="label" tone="muted" part="goal" tabular>{copy.goal}</KitText>}
    </KitContent>
  );
}

export function Measurements({
  label,
  unit,
  points,
  goal,
  range,
  goto,
  surface,
  detail,
}: Props<typeof props, typeof meta>) {
  const full = useVariant("detail", meta.variants.detail, detail) === "full";
  const { lang, words } = useWords(healthWordsFor);
  const { measurementLabels } = words;
  const state = useComponentState();
  const context = usePartContext();
  const value = useControlValue<unknown>(`${context.screen}/${context.component}/range`, range);
  const selected = measurementRange(value, range, lang);
  const copy = measurementCopy(points, unit, goal, lang);
  if (state === "empty")
    return (
      <KitCard style="inset" padded part="root" surface={surface}>
        <KitEmpty part="label" decorativeIcon />
      </KitCard>
    );
  return (
    <KitCard style="inset" padded part="root" surface={surface}>
      <MeasurementSummary label={label} copy={copy} full={full} />
      <KitLinePlot
        part="plot"
        style="compact"
        loading={state === "loading"}
        series={[{ id: "measurement", label, points: measurementPoints(points, selected, lang) }]}
        {...(goal === undefined ? {} : { goal: { value: goal, label: copy.goal! } })}
      />
      {state === "loading" ? (
        <KitSkeleton rows={1} shape="control" label={measurementLabels.ranges} full />
      ) : (
        <KitTrack look="segments" part="range" role="radiogroup" label={measurementLabels.ranges}>
          {measurementRanges.map((option) => (
            <KitChip
              key={option}
              item={null}
              look="segment"
              role="radio"
              label={measurementLabels[option]}
              on={selected === option}
            />
          ))}
        </KitTrack>
      )}
      <KitAction label={measurementLabels.add} goto={goto.goto} part="add" kind="secondary" full />
    </KitCard>
  );
}
