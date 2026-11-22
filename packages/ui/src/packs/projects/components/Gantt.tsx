import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { ganttChart, ganttCopy, ganttReading } from "../copy";
import { projectsWordsFor } from "../lang";
import { acyclic, dayOf, seedFriday, seedLabels, seedMonday, seedSunday, unique } from "../seeds";
import { prompt } from "../../../entry/prompt-Gantt.generated";

const scales = ["week", "month"] as const;
// Core first: Timeline/hours cannot show overlapping multi-day task bars and finish-to-start links.
export const meta = {
  id: "Gantt",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Scheduled tasks and milestone dates are stored on the device, with dependency links checked for cycles.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["dates", "after", "conflict"] } },
  parts: ["root", "range", "chart", "empty"],
  items: { key: "targets", parts: ["root", "title", "dates", "after", "conflict", "outside"] },
  states: ["filled", "empty", "loading"],
  emptyActions: [],
  actions: { parts: { range: ["select"] }, items: { root: ["press"] } },
  select: {
    prop: "style",
    choices: { range: scales.map((value) => ({ value, label: projectsWordsFor().gantt[value] })) },
  },
  read: ganttReading,
} as const satisfies c.Meta;

const ref = c.text(32).meta({ kind: undefined });
const task = z
  .strictObject({
    taskRef: ref,
    title: c.text(32),
    start: c.isoDate,
    end: c.isoDate,
    after: z.array(ref).min(0).max(3).refine(unique),
    goto: c.screenId.optional(),
  })
  .refine(({ start, end }) => start <= end, { path: ["end"], message: "End cannot precede start" });
const gate = z.strictObject({ title: c.text(32), due: c.isoDate, goto: c.screenId.optional() });

const schema = z
  .strictObject({
    ...c.variantProps(meta.variants),
    projectRef: ref,
    from: c.isoDate,
    to: c.isoDate,
    tasks: z.array(task).min(1).max(12),
    gates: z.array(gate).min(0).max(6),
    style: z.enum(scales).default("week"),
  })
  .refine(({ from, to }) => dayOf(to) - dayOf(from) >= 6 && dayOf(to) - dayOf(from) < 90, {
    path: ["to"],
    message: "Choose an inclusive range of 7–90 days",
  })
  .refine(({ tasks }) => unique(tasks.map(({ taskRef }) => taskRef)) && acyclic(tasks), {
    path: ["tasks"],
    message: "Use distinct task refs and acyclic dependencies",
  });

function withTargets(value: z.output<typeof schema>) {
  return {
    ...value,
    targets: [
      ...value.tasks.map((task) => ({ ...task, kind: "task" as const, root: task.goto })),
      ...value.gates.map((gate) => ({ ...gate, kind: "gate" as const, root: gate.goto })),
    ],
  };
}

export const props = schema.overwrite(withTargets) as typeof schema &
  z.ZodType<ReturnType<typeof withTargets>, z.input<typeof schema>>;

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    projectRef: "project_1",
    from: seedMonday,
    to: seedSunday,
    gates: [],
    tasks: [
      { taskRef: "item_1", title: seedLabels(input).title, start: seedMonday, end: seedFriday, after: [] },
    ],
  };
}

// prettier-ignore
const routeGuide = { projectRef: "route_guide", style: "month", from: "2026-11-01", to: "2026-11-30",
  tasks: [
    { taskRef: "map", title: "Map route", start: "2026-10-29", end: "2026-11-10", after: [] },
    { taskRef: "test", title: "Test route", start: "2026-11-09", end: "2026-11-14", after: ["map"] },
  ],
  gates: [{ title: "Guide ready", due: "2026-11-15" }] } satisfies z.input<typeof props>;

// prettier-ignore
export const examples = [
  { projectRef: "garden", from: seedMonday, to: seedSunday,
    tasks: [
      { taskRef: "survey", title: "Check light", start: seedMonday, end: "2026-11-17", after: [], goto: "survey" },
      { taskRef: "planting", title: "Plan plants", start: "2026-11-18", end: seedFriday, after: ["survey"] },
    ],
    gates: [{ title: "Plan ready", due: "2026-11-18", goto: "garden_scope" }] },
  routeGuide,
  { ...routeGuide, density: "compact" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Gantt");
export const probes = [
  choose(
    "Draw horizontal bars for overlapping tasks across several dates, with links from prerequisite finishes to later starts.",
  ),
  choose(
    "Lay out one day's appointments by their start and end time, with no multi-day tasks or dependencies.",
    "Timeline",
  ),
  write(
    "Show project garden as day columns from 2026-11-16 through 2026-11-22. Task survey, Check balcony light, runs Nov 16–17 and links to survey. Task planting, Plan the balcony planting, runs Nov 18–20 after survey. Plan ready is a gate on Nov 20.",
  ),
  read("Open the scheduled task for checking the balcony light.", { address: "g1/r1", action: "press" }),
  {
    ...write(
      "For project garden, show the chart from 2026-11-16 through 2026-11-22. Check balcony light (survey) runs Nov 16–17; Plan planting (planting) runs Nov 18–20 after survey. Keep the chart and dates, but hide the date and dependency notes beneath it.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type ScheduleCopy = ReturnType<typeof ganttCopy<View["targets"][number]>>;
type GanttWords = ReturnType<typeof projectsWordsFor>["gantt"];

// prettier-ignore
function ScheduleDetails({ copy, words, density, loading }: { copy: ScheduleCopy; words: GanttWords; density: View["density"]; loading: boolean }) {
  return <kit.KitContent group="response" density={density}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", copy.details]]} /> :
      <kit.KitText role="label" tone="muted" part={null}>{copy.details}</kit.KitText>}
    <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
    {copy.entries.map(({ entry, inRange, dates, after, conflict }) => {
      const root = inRange && entry.goto ? null : "root";
      const inline = inRange || !entry.goto;
      const title = <kit.KitText part="title" item={entry.id} role="label" density={density}>{entry.title}</kit.KitText>;
      if (loading) return <kit.KitRow key={entry.id} part={null} label={entry.title} inset="none" density={density} inline={inline}>
        <kit.KitSkeleton shape="figure" inset="none" density={density}
          content={[["label", entry.title], ["caption", dates], ["caption", after],
            ["caption", conflict ? words.conflict : undefined], ["caption", inRange ? undefined : words.outside]]} />
      </kit.KitRow>;
      if (inRange && !dates)
        return <kit.KitText key={entry.id} part={root} item={entry.id} role="label" density={density}>{title}</kit.KitText>;
      return <kit.KitRow key={entry.id} item={entry.id} part={root} goto={inRange ? undefined : entry.goto}
        label={entry.title} inset="none" density={density} inline={inline}>
            <kit.KitContent lineRole="body" density={density}>
              {title}
              {dates && <kit.KitText part="dates" role="caption" tone="muted">{dates}</kit.KitText>}
              {after && <kit.KitText part="after" role="caption" tone="muted">{after}</kit.KitText>}
              {conflict && <kit.KitText part="conflict" role="caption" tone="warn">{words.conflict}</kit.KitText>}
              {!inRange && <kit.KitText part="outside" role="caption" tone="muted">{words.outside}</kit.KitText>}
            </kit.KitContent>
      </kit.KitRow>;
    })}
    </kit.KitGrid>
  </kit.KitContent>;
}

// prettier-ignore
export function Gantt(input: View) {
  const state = kit.useComponentState();
  const { lang, words: { gantt: words } } = kit.useWords(projectsWordsFor);
  const loading = state === "loading";
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const chart = state === "empty" ? undefined : ganttChart(input, lang);
  const copy = state === "empty" ? undefined : ganttCopy({ ...input, detail }, lang);
  return <kit.KitCard part="root" padded density={density}>
    {state === "empty" ? <kit.KitEmpty part="empty" icon="calendar" decorativeIcon /> :
      copy && chart && <>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" density="comfortable" content={[["heading", copy.range]]} /> :
          <kit.KitText part={null} role="heading" density="comfortable">{copy.range}</kit.KitText>}
        <kit.KitTrack part="range" role="radiogroup" look="segments" label={words.range}>
          {scales.map((value) => <kit.KitChip key={value} item={null} disabled={loading ? true : undefined}
            role="radio" look="segment" label={words[value]} on={input.style === value} value={value} />)}
        </kit.KitTrack>
        {!loading && copy.noDates ? <kit.KitText part="chart" tone="muted">{copy.noDates}</kit.KitText> :
          <kit.KitGantt part="chart" {...chart} loading={loading} />}
        <ScheduleDetails {...{ copy, words, density, loading }} />
      </>}
  </kit.KitCard>;
}
