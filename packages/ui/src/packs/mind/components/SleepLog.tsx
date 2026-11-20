import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { nightMinutes, readSleepLog, sleepLogLines } from "../copy";
import { mindWordsFor } from "../lang";

// Core first: Timeline/hours lays out events, not overnight sleep versus awake time, quality and a weekly average.
export const meta = {
  id: "SleepLog",
  status: "ready",
  group: "data",
  purpose: "Review last night's sleep, its quality and the week's average.",
  pick: "One night's bedtime and wake time with an asleep versus awake bar, quality face and weekly sleep average. Not a schedule of timed events (Timeline) or one rating alone (Scale).",
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { import: "ok" },
  realPath: "Sleep times are typed in or read from the phone's sleep data with permission.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["average"] } },
  parts: ["root", "bed", "wake", "duration", "night", "quality", "average", "edit", "import", "empty"],
  states: ["filled", "empty"],
  actions: { parts: { edit: ["press"] } },
  emptyActions: ["edit.press"],
  writeHints: [
    "Use 24-hour HH:MM for bed and wake. Awake minutes cannot exceed the interval from bed to wake across midnight. If supplied, week contains exactly seven hours values from 0 to 24; never write duration or average.",
    'Use detail "brief" only when asked to show the night without the weekly average. Keep the seven nights in week if supplied.',
  ],
  read: (input, state, lang): string[] => {
    if (state === "empty") return [JSON.stringify(mindWordsFor(lang).sleep.log)];
    if (state !== "filled") return [];
    const night = input as z.output<typeof props>;
    return readSleepLog(night, night.detail !== "brief", lang);
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    bed: c.clock,
    wake: c.clock,
    awake: z.int().min(0).max(1439).optional(),
    quality: z.int().min(1).max(5).optional(),
    week: z.array(z.number().min(0).max(24)).min(7).max(7).optional(),
    goto: c.screenId,
  })
  .refine(({ bed, wake, awake }) => awake === undefined || awake <= nightMinutes(bed, wake), {
    path: ["awake"],
    message: "Awake minutes cannot exceed the time between bed and wake",
  });

export function fallback({ cast }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  const times = item ? c.textsOf(item, thing).filter((value) => c.clock.safeParse(value).success) : [];
  const zero = c.placeholderValue.repeat(2);
  const bed = times[0] ?? `${zero}:${zero}`;
  return { bed, wake: times[1] ?? bed, goto: "sleep_log" };
}

export const examples = [
  {
    bed: "22:45",
    wake: "06:45",
    awake: 30,
    quality: 4,
    week: [7, 7.5, 8, 6.5, 7, 8, 7.5],
    goto: "sleep_log",
  },
  { bed: "23:15", wake: "07:20", goto: "sleep_log" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SleepLog");
export const probes = [
  choose(
    "Show how last night went: when I went to bed and woke, a bar for time asleep versus awake, a quality face, and my average over the week.",
  ),
  choose(
    "Lay out tomorrow's timed activities from 8 AM to 8 PM in chronological order, not last night's sleep.",
    "Timeline",
  ),
  write(
    "Last night's bedtime 22:45 and wake time 06:45, with 30 minutes awake, quality four, and seven nights at 7, 7.5, 8, 6.5, 7, 8 and 7.5 hours. Edit goes to sleep_log.",
  ),
  {
    ...write(
      "Show last night only: slept from 23:15 to 07:20 with 25 minutes awake and quality 4 out of 5. Store all seven nights (7, 8, 6, 8, 7, 7.5, 8 hours), but hide the weekly average. Edit opens sleep_log.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the screen where I can edit last night's sleep times.", { address: "s1/edit", action: "press" }),
] satisfies c.Probe[];

type SleepLogProps = c.Props<typeof props, typeof meta>;
type Density = c.AxisValue<"density">;

function SleepValue({
  part,
  label,
  value,
  density,
}: {
  part: "bed" | "wake" | "average";
  label: string;
  value: string;
  density: Density;
}) {
  return (
    <kit.KitContent density={density}>
      <kit.KitText part={null} tone="muted" role="caption" density={density}>
        {label}
      </kit.KitText>
      <kit.KitText part={part} role="number" numberScale="compact" tabular density={density}>
        {value}
      </kit.KitText>
    </kit.KitContent>
  );
}

// prettier-ignore
function NightSummary({ input, density, full }: { input: SleepLogProps; density: Density; full: boolean }) {
  const { lang, words: { sleep } } = kit.useWords(mindWordsFor);
  const lines = sleepLogLines(input, lang);
  return (
    <>
      <kit.KitContent density={density}>
        <kit.KitText part={null} role="caption" tone="muted" density={density}>{sleep.duration}</kit.KitText>
        <kit.KitText part="duration" role="number" tabular density={density}>{lines.duration}</kit.KitText>
      </kit.KitContent>
      <kit.KitContent group="response" density={density}>
        <kit.KitGrid density={density}>
          <SleepValue part="bed" label={sleep.bed} value={lines.bed} density={density} />
          <SleepValue part="wake" label={sleep.wake} value={lines.wake} density={density} />
        </kit.KitGrid>
      </kit.KitContent>
      <kit.KitContent group="response" density={density}>
        <kit.KitGrid density={density}>
          <kit.KitText part={null} role="caption" density={density}>{lines.share}</kit.KitText>
          <kit.KitText part={null} role="caption" density={density} tone="muted">{lines.awake}</kit.KitText>
        </kit.KitGrid>
        <kit.KitStepsTrack part="night" style="bar" {...lines.track} />
      </kit.KitContent>
      {(lines.quality !== undefined || (full && lines.average !== undefined)) && (
        <kit.KitContent group="response" density={density}>
          <kit.KitGrid density={density}>
            {lines.quality !== undefined && (
              <kit.KitContent density={density}>
                <kit.KitText part={null} role="caption" tone="muted" density={density}>{sleep.quality}</kit.KitText>
                <kit.KitContent lead={
                  <kit.KitText part={null} role="body" density={density}>{lines.quality}</kit.KitText>
                } lineRole="body" density={density}>
                  <kit.KitScaleTrack style="mood" single readonly part="quality"
                    value={input.quality ?? 0} labels={sleep.qualityLevels} />
                </kit.KitContent>
              </kit.KitContent>
            )}
            {full && lines.average !== undefined &&
              <SleepValue part="average" label={sleep.average} value={lines.average} density={density} />}
          </kit.KitGrid>
        </kit.KitContent>
      )}
    </>
  );
}

// prettier-ignore
export function SleepLog(input: SleepLogProps) {
  const empty = kit.useComponentState() === "empty";
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const { words } = kit.useWords(mindWordsFor);
  return (
    <kit.KitCard part="root" padded density={density} surface={surface}>
      {empty
        ? <kit.KitEmpty part="empty" icon="moon" decorativeIcon />
        : <NightSummary {...{ input, density, full }} />}
      {!empty && <kit.KitContent group="response" density={density}>
        <kit.KitText part="import" tone="muted" role="caption" density={density}>{words.sleep.import}</kit.KitText>
      </kit.KitContent>}
      <kit.KitContent group={empty ? "content" : "response"} density={density}>
        <kit.KitAction part="edit" label={empty ? words.sleep.log : words.editSleep}
          goto={input.goto} kind="secondary" full />
      </kit.KitContent>
    </kit.KitCard>
  );
}
