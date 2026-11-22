import { z } from "zod";
import {
  clip,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import * as kit from "../../../kit";
import { funnelLines } from "../copy";
import { dataWordsFor } from "../lang";

// Core first: Bars/default compares independent amounts and Bars/share divides a whole; neither computes conversion between ordered stages.
export const meta = {
  id: "Funnel",
  status: "ready",
  group: "data",
  tier: "phone",
  pick: "stage-by-stage drop-off and conversion rates across a sequential pipeline. Not independent categories (Bars), 100% part-to-whole shares (Bars[share]), or movable stage cards (Board).",
  purpose: "Show where records drop off between ordered stages of a conversion pipeline.",
  writeHints: [
    "List two to six stages in pipeline order with raw counts and optional monetary values; code computes all rates. The unit describes the count. Use goto only for an explicitly linked stage.",
    'Use style "summary" for rows without bars and detail "brief" if monetary amounts should be hidden. Keep the monetary values in the input when merely hiding them.',
  ],
  region: "body",
  weight: 2,
  realPath: "stage counts and totals aggregated from stored records on the device.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["value"] } },
  parts: ["root", "title", "overall", "empty"],
  items: { key: "stages", parts: ["root", "label", "count", "step", "value"] },
  actions: { items: { root: ["press"] }, when: { root: { linked: true } } },
  states: ["filled", "empty", "loading"],
  read: (input, state, lang, _data, currency): string[] => {
    if (state !== "filled") return [];
    const { overall, stages } = funnelLines(input as FunnelProps, lang, currency);
    return [
      overall,
      ...stages.flatMap(({ count, step, value }) =>
        [count, step, value].filter((line): line is string => line !== undefined),
      ),
    ];
  },
} as const satisfies Meta;
// prettier-ignore
export const props = z.strictObject({
  ...variantProps(meta.variants),
  title: text(32),
  stages: z
    .array(
      z.strictObject({
        label: text(20),
        count: z.number().min(0),
        value: z.number().min(0).optional(),
        goto: screenId.optional(),
      }),
    )
    .min(2)
    .max(6),
  unit: text(12).optional(),
  style: z.enum(["bars", "summary"]).default("bars"),
}).overwrite((input) => ({
  ...input,
  stages: input.stages.map((stage) => ({ ...stage, linked: Boolean(stage.goto) })),
}));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 2, thing?.type);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    title: castTitle(32, 0),
    stages: Array.from({ length: 2 }, (_, index) => ({ label: castTitle(20, index), count: 0 })),
  };
}

export const examples = [
  {
    title: "Plant care sign-ups",
    unit: "people",
    stages: [
      { label: "Visited the guide", count: 240 },
      { label: "Started a plan", count: 120, value: 1200 },
      { label: "Set a reminder", count: 72, goto: "reminders" },
    ],
  },
  {
    title: "Walk bookings",
    style: "summary",
    stages: [
      { label: "Enquiries", count: 80, value: 2400 },
      { label: "Trial walks", count: 40, value: 1200 },
      { label: "Recurring bookings", count: 30, value: 900 },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Funnel");
export const probes = [
  choose(
    "Follow people from opening the guide to starting a plan to setting a reminder. Show how many made it through each step, and what fraction carried over from the previous stage.",
  ),
  choose(
    "Compare how many visits came from email, search and referrals as three independent horizontal bars. No sequence or conversion between them.",
    "Bars",
  ),
  write(
    "Show Plant care sign-ups as an ordered drop-off chart in people. Visited the guide: 240; Started a plan: 120; Set a reminder: 72, opens reminders.",
  ),
  {
    ...write(
      "Show Walk bookings as a funnel: 80 Enquiries worth 2400, 40 Trial walks worth 1200 and 30 Recurring bookings worth 900. Keep the amounts in the data but show only the counts and conversion on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the people who set a reminder.", { address: "f1/r3", action: "press" }),
] satisfies Probe[];

type FunnelProps = Props<typeof props, typeof meta>;
type StageLine = ReturnType<typeof funnelLines>["stages"][number];

// prettier-ignore
function FunnelStage({ stage, line, compact, first, density, loading }: {
  stage: FunnelProps["stages"][number]; line: StageLine; compact: boolean;
  first: boolean; density: FunnelProps["density"]; loading: boolean;
}) {
  const count = { text: line.count, part: "count", role: "figure", compact: true, tabular: true } as const;
  const value = { text: line.value, part: "value", role: compact ? "meta" : "caption", tabular: true } as const;
  const step = { text: line.step, part: "step", role: "caption" } as const;
  const title = { text: stage.label, part: "label", ...(stage.goto && { tone: "accent" as const }) };
  return <kit.KitContent density={density}>
    <kit.KitRow item={stage.id} label={stage.label} goto={loading ? undefined : stage.goto}
      density={density} inset="none" inline={!compact || first} fitContent
      trailing={!compact && <kit.KitLayoutText line={count} align="end" density={density} />}>
      {compact ? <kit.KitContent density={density}>
        <kit.KitRow part={null} label={stage.label} inline fitContent density={density}
          trailing={line.step && <kit.KitTrail kind="badge" value={line.step} part="step" density={density} tone="muted" />}>
          <kit.KitLayoutText line={title} density={density} />
        </kit.KitRow>
        <kit.KitGrid fitLast density={density}>
          <kit.KitLayoutText line={count} density={density} />
          <kit.KitLayoutText line={{ ...value, tone: "muted" }} align="end" density={density} />
        </kit.KitGrid>
      </kit.KitContent> : line.step && line.value ? <kit.KitContent density={density}>
        <kit.KitLayoutText line={title} density={density} />
        <kit.KitFigure value={{ ...step, tone: "muted" }} unit={value} density={density} />
      </kit.KitContent> : <kit.KitMetaLine {...{ title, density }} meta={[step, value]} />}
    </kit.KitRow>
    {!compact && <kit.KitMeter label="" amount="" ratio={loading ? 0 : line.ratio} slim addressed={false} />}
  </kit.KitContent>;
}

// prettier-ignore
export function Funnel(input: FunnelProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const loading = kit.useComponentState() === "loading";
  const { lang, words } = kit.useWords(dataWordsFor);
  const currency = kit.useAppCurrency();
  const { rate, stages } = funnelLines({ ...input, detail }, lang, currency);
  const compact = input.style === "summary";
  const content = <>
    <kit.KitContent density={density}>
      <kit.KitHeader title={{ text: input.title, part: "title" }} density={density} />
      <kit.KitFigure value={{ text: rate, part: "overall", compact: true }}
        unit={{ text: words.funnelOverall, role: compact ? "meta" : "caption" }} density={density} />
    </kit.KitContent>
    <kit.KitRowGroup density={density} separators={compact} spacing={compact ? "rows" : "groups"}>
      {input.stages.map((stage, index) =>
        <FunnelStage key={stage.id} stage={stage} line={stages[index]!} first={index === 0} {...{ compact, loading, density }} />)}
    </kit.KitRowGroup>
  </>;
  return <kit.KitCard padded {...{ surface, density }}>
    <kit.KitState part="empty" loading={content} density={density}>{content}</kit.KitState>
  </kit.KitCard>;
}
