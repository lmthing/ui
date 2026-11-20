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
  useWords,
  KitGrid,
  KitRadialTrack,
  KitRow,
  KitSkeleton,
  KitText,
  useComponentState,
  useVariant,
} from "../../../kit";
import { activityRingLine } from "../copy";
import { seedTitles } from "..";

// Core first: Ring/default cannot show two or three independently filled concentric daily goals.
export const meta = {
  id: "ActivityRings",
  status: "ready",
  group: "data",
  purpose: "Track multiple daily goals together, never a single daily goal.",
  pick: "Requires at least two distinct daily goals, each with its own value and target, shown as concentric rings. Not a single step, exercise, water or other goal: choose Ring for any one goal, regardless of health context. Not targets drawn as bars (Progress).",
  region: "body",
  weight: 2,
  tier: "phone",
  signature: "ring_fill",
  realPath: "Totals stored on the device; phone health-store or watch imports need read permission.",
  writeHints: [
    "Write surface null unless asked for an outline. Do not write the default surface card. To hide target captions, use detail brief and still write each target in of.",
  ],
  variants: { surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["of"] } },
  items: { key: "rings", parts: ["root", "label", "value", "of", "unit"] },
  parts: ["root", "rings"],
  states: ["filled", "loading"],
  read: (input, state, lang?: string): string[] => {
    const { rings, detail } = input as z.output<typeof props>;
    return state === "filled" ? rings.map((ring) => activityRingLine(ring, lang, detail !== "brief")) : [];
  },
} as const satisfies Meta;
export const props = z.strictObject({
  ...variantProps(meta.variants),
  rings: z
    .array(
      z.strictObject({
        label: text(16),
        value: z.number().min(0).max(1000000),
        of: z.number().positive().max(1000000),
        unit: text(8),
      }),
    )
    .min(2)
    .max(3),
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
] satisfies z.input<typeof props>[];
const { choose, write } = probesFor("ActivityRings");
export const probes = [
  choose(
    "Show move, exercise and stand as three concentric daily rings, each with a separate value and goal",
  ),
  choose("Show just one circular daily step goal, 3000 of 8000, no other goals", "Ring"),
  write("Three daily goals: Move 280 of 400 kcal, Exercise 20 of 30 min, Stand 7 of 12 hours"),
  {
    ...write(
      "Show two daily goals as rings: Move 280 of 400 kcal and Exercise 20 of 30 min. Keep the target numbers in the data for the rings, but hide the target captions.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies Probe[];

const ringTones = ["accent", "good", "warn"] as const;
const numberScaleOf = (value: number, count: number) =>
  value >= (count === 3 ? 1000 : 10000) ? ("compact" as const) : ("display" as const);

const ringNumber = (value: number, count: number) =>
  ({ role: "number", align: "center", tabular: true, numberScale: numberScaleOf(value, count) }) as const;

// prettier-ignore
export function ActivityRings({ rings, detail, surface }: Props<typeof props, typeof meta>) {
  const full = useVariant("detail", meta.variants.detail, detail) === "full";
  const { lang } = useWords();
  const loading = useComponentState() === "loading";
  return (
    <KitCard style="inset" part="root" padded surface={surface}>
      <KitRadialTrack
        part="rings"
        style="rings"
        loading={loading}
        rings={rings.map((ring, index) => ({
          id: ring.id,
          ratio: ring.value / ring.of,
          tone: ringTones[index]!,
        }))}
      />
      <KitGrid columns={rings.length === 2 ? 2 : 3}>
        {rings.map((ring, index) =>
          loading ? (
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
                  numberScale: numberScaleOf(ring.value, rings.length),
                },
                { text: full ? `${goalLine(ring.of, lang)} ${ring.unit}` : ring.unit, role: "caption", align: "center" },
              ]}
            />
          ) : (
            <KitRow key={ring.id} item={ring.id} label={ring.label} inline inset="none">
              <KitText role="caption" tone={ringTones[index]!} align="center" part="label">
                {ring.label}
              </KitText>
              <KitText {...ringNumber(ring.value, rings.length)} part="value">
                {numberLine(ring.value, lang)}
              </KitText>
              {full ? <KitText role="caption" tone="muted" align="center" part="of">
                {goalLine(ring.of, lang)}{"\u00a0"}<KitText role="caption" tone="muted" part="unit">{ring.unit}</KitText>
              </KitText> : <KitText role="caption" tone="muted" align="center" part="unit">{ring.unit}</KitText>}
            </KitRow>
          ),
        )}
      </KitGrid>
    </KitCard>
  );
}
