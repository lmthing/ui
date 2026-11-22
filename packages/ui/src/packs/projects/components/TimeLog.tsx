import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import * as log from "../copy";
import { projectsWordsFor } from "../lang";
import { dayOf, seedLabels, seedMonday } from "../seeds";
import { prompt } from "../../../entry/prompt-TimeLog.generated";

// Core first: Timer/up cannot save task-linked time entries or show a week's work records.
// prettier-ignore
export const meta = {
  id: "TimeLog",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "Timestamped work entries are stored on the device; export opens the phone share sheet without submitting payroll.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["note"] } },
  parts: ["root", "week", "day", "day_total", "week_total", "timer", "timer_label", "elapsed",
    "discard", "discard_label", "add", "add_label", "export", "export_label", "empty", "status"],
  items: {
    key: "entries", visibleWhen: { visible: true },
    parts: ["root", "title", "start", "end", "duration", "billable", "note", "remove", "remove_icon"],
    records: { keys: ["projectRef", "start"], parts: { remove: { action: "press", remove: true } } },
  },
  confirmParts: ["remove"], partTiers: { export: "service" },
  states: ["filled", "empty", "loading", "success"],
  actions: {
    parts: { timer: ["start", "stop"], discard: ["press"], add: ["press"], export: ["press"] },
    items: { root: ["press"], remove: ["press"] },
    noGoto: { items: ["remove"] },
    when: { "timer.start": { canStart: true }, "timer.stop": { timerRunning: true },
      discard: { timerRunning: true }, export: { hasEntries: true } },
  },
  clocks: [
    {
      id: "elapsed", kind: "up", prop: "timerSeconds", runningProp: "timerRunning",
      start: { part: "timer", action: "start", state: "filled" },
      stop: { part: "timer", action: "stop", state: "success" },
      reset: { part: "discard", action: "press" },
      commitOnStop: {
        rows: "entries", week: "week", selection: ["projectRef", "taskRef", "day"],
        timeZone: log.timeLogZone, validTarget: log.canTimeLog, record: log.timedEntry,
      },
    },
  ],
  emptyActions: ["timer.start", "timer.stop", "discard.press", "add.press"],
  successActions: ["timer.start", "timer.stop", "discard.press", "add.press", "export.press", "root.press", "remove.press"],
  readSuccess: true, read: log.timeLogReading,
  deviceData: ["project_calendar", "project_time_targets"],
  deviceDataFlags: { canStart: log.canStartTimeLog },
  live: {
    derive(input): Record<string, unknown> {
      if (input.detail !== "brief" || !Array.isArray(input.entries)) return {};
      return { entries: input.entries.map((row: object) => ({ ...row, note: undefined })) };
    },
  },
} as const satisfies c.Meta;
const ref = c.text(32).meta({ kind: undefined });
const isoOffset = z.iso.datetime({ offset: true });
const timestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/)
  .refine((value) => isoOffset.safeParse(value).success && Number.isFinite(Date.parse(value)));
// prettier-ignore
const entry = z.strictObject({
  projectRef: ref, taskRef: ref.optional(), title: c.text(32), start: timestamp, end: timestamp,
  billable: z.boolean(), note: c.text(36).optional(), goto: c.screenId.optional(),
});

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), week: c.isoDate, entries: z.array(entry).min(0).max(14),
  projectRef: ref.optional(), taskRef: ref.optional(), addGoto: c.screenId.optional(),
  day: c.isoDate.optional(), style: z.enum(["days", "single_day"]).default("days"),
})
  .refine(({ week }) => new Date(`${week}T00:00:00Z`).getUTCDay() === 1,
    { path: ["week"], message: "The week starts on Monday" })
  .refine(({ taskRef, projectRef }) => !taskRef || !!projectRef,
    { path: ["projectRef"], message: "A task timer needs a project" })
  .refine(({ style, entries, day, week }) => style === "single_day"
      ? !!day && dayOf(day) >= dayOf(week) && dayOf(day) < dayOf(week) + 7 && entries.length <= 6 : day === undefined,
    { path: ["day"], message: "Single-day logs need one day in the selected week and at most six entries" },
  )
  .refine(log.validTimeEntries, { path: ["entries"], message: "Entries must fit the week, have positive duration and not overlap" })
  .overwrite((value) => ({
    ...value, weekMs: log.weekElapsed(value.entries), hasEntries: !!value.entries.length,
    add: value.addGoto ? { goto: value.addGoto } : undefined,
    entries: value.entries.map((row) => ({
      ...row, root: row.goto, visible: !value.day || log.appearsOn(row, value.day),
    })),
  }));

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { week: seedMonday, projectRef: "project_1", entries: [{
    projectRef: "project_1", title: seedLabels(input).title, billable: false,
    start: `${seedMonday}T09:00:00Z`, end: `${seedMonday}T09:30:00Z`,
  }] };
}

// prettier-ignore
export const examples = [
  { week: seedMonday, projectRef: "garden", taskRef: "survey", addGoto: "new_time",
    entries: [{ projectRef: "garden", taskRef: "survey", title: "Check balcony light", billable: false,
      start: "2026-11-16T09:00:00+01:00", end: "2026-11-16T09:30:00+01:00", note: "Measured morning sun", goto: "survey_time" },
    { projectRef: "garden", title: "Draw the pot layout", billable: true,
      start: "2026-11-17T11:00:00+01:00", end: "2026-11-17T12:15:00+01:00" }] },
  { week: seedMonday, style: "single_day", day: "2026-11-19", detail: "brief", projectRef: "route_guide",
    entries: [{ projectRef: "route_guide", title: "Draw park route", billable: true,
      start: "2026-11-19T14:00:00Z", end: "2026-11-19T15:15:00Z", note: "Drafted two route options" }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("TimeLog");
// prettier-ignore
export const probes = [
  choose("Save each stretch of work against its project and task, mark it billable or not, and see day and week totals."),
  choose("I only want a stopwatch that counts upward for one activity now. Don't save or group sessions.", "Timer"),
  write("Show a saved non-billable entry Check balcony light for project garden and task survey from 09:00 to 09:30 on 2026-11-16 at UTC+01:00, week of 2026-11-16. The current timer targets garden and survey. Link manual entry to new_time."),
  {
    ...write("For the week of 2026-11-16, show a saved billable Draw park route entry for project route_guide on Nov 19 from 14:00 to 15:15 UTC. Store the note Drafted two route options but hide the notes from the display."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the manual time entry form.", { address: "t1/add", action: "press" }),
] satisfies c.Probe[];
type Input = c.Props<typeof props, typeof meta>;
type View = Input & { timerRunning?: boolean; timerSeconds?: number; weekMs?: number };
type Row = ReturnType<typeof log.timeLogCopy<Input["entries"][number]>>["days"][number]["rows"][number];
type Words = ReturnType<typeof projectsWordsFor>["timeLog"];
// prettier-ignore
function Entry({ copy, density, w, loading }: { copy: Row; density: Input["density"]; w: Words; loading: boolean }) {
  const { row, start, end, duration, billable, note } = copy, scope = kit.usePartContext();
  const remove = <kit.PartScope {...scope} item={row.id}>
    <kit.KitAction part="remove" kind="quiet" icon="trash" a11y={w.remove(row.title)} />
  </kit.PartScope>;
  return <kit.KitRow part={null} label={row.title} density={density} inset="none" trailing={remove}>
    <kit.KitRow {...(loading ? { part: null } : { item: row.id, goto: row.goto })} label={row.title} density={density} inline>
      <kit.KitContent density={density}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", row.title]]} /> :
        <kit.KitContent lineRole="body" lead={row.goto && <kit.KitIcon name="chevron_right" scale="sm" decorative />}>
          <kit.KitText part="title" role="body" emphasis="strong">{row.title}</kit.KitText>
        </kit.KitContent>}
      <kit.KitGrid columns={3} density={density}>{loading ? [`${start}${w.range}${end}`, duration, billable].map((value, index) =>
          <kit.KitSkeleton key={index} shape="figure" inset="none" density={density} content={[["label", value]]} />) : [
      <kit.KitText key="range" role="label" tone="muted" tabular part={null}>
        <kit.KitText part="start" role="label" tone="muted" tabular>{start}</kit.KitText>{w.range}
        <kit.KitText part="end" role="label" tone="muted" tabular>{end}</kit.KitText>
      </kit.KitText>,
      <kit.KitText key="duration" part="duration" role="label" emphasis="strong" tabular>{duration}</kit.KitText>,
      <kit.KitText key="billable" part="billable" role="label" tone={row.billable ? "good" : "muted"}>{billable}</kit.KitText>,
      ]}</kit.KitGrid>
      {note && (loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", note]]} /> :
        <kit.KitText part="note" role="label" tone="muted">{note}</kit.KitText>)}
      </kit.KitContent></kit.KitRow></kit.KitRow>;
}
// prettier-ignore
export function TimeLog(seed: Input) {
  const input = kit.useLiveControls(meta, seed) as View, state = kit.useComponentState();
  const { lang, words: { timeLog: w } } = kit.useWords(projectsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const copy = log.timeLogCopy({ ...input, detail }, lang, kit.useDeviceData());
  const loading = state === "loading", empty = state === "empty" || !copy.days.some(({ rows }) => rows.length);
  const exportable = state !== "empty" && input.entries.length > 0;
  return <kit.KitCard part="root" style="inset" padded density={density} {...(loading ? { label: c.wordsFor(lang).loadingLabel } : {})}>
    {state !== "empty" && <kit.KitContent density={density}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["label", copy.week], ["number", copy.total], ["label", w.weekTotal]]} /> : <>
      <kit.KitText part="week" role="label" tone="muted">{copy.week}</kit.KitText>
      <kit.KitText part="week_total" role="number" tabular>{copy.total}</kit.KitText>
      <kit.KitText part={null} role="label" tone="muted">{w.weekTotal}</kit.KitText>
      {state === "success" && <kit.KitText part="status" role="label" tone="good">{w.saved}</kit.KitText>}
      </>}
    </kit.KitContent>}
    {empty ? <kit.KitEmpty part="empty" icon="clock" decorativeIcon /> : copy.days.map(({ day, date, total, rows }, i) =>
      <kit.KitContent key={day} density={density} group={density === "compact" ? "content" : "response"}>
        <kit.KitGrid fitLast density={density}>
          {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", date]]} /> :
            <kit.KitText part={i ? null : "day"} role="label" emphasis="strong">{date}</kit.KitText>}
          {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["number", total, "start", "compact"]]} /> :
            <kit.KitText part={i ? null : "day_total"} role="number" numberScale="compact" tabular>{total}</kit.KitText>}
        </kit.KitGrid>{rows.map((row) => <Entry key={row.row.id} copy={row} {...{ density, w, loading }} />)}
      </kit.KitContent>)}
    {(copy.timer || input.projectRef || input.addGoto || exportable) && <kit.KitContent group="response" density={density}>
      {copy.timer && !loading && <kit.KitText part="elapsed" role="number" tabular>{copy.timer}</kit.KitText>}
      {(input.projectRef || copy.timer) && <kit.KitAction part="timer" action={copy.timer ? "stop" : "start"}
        label={copy.timer ? w.stop : w.start} kind={empty || copy.timer ? "primary" : "secondary"} full />}
      {copy.timer && <kit.KitAction part="discard" kind="quiet" label={w.discard} full />}
      {(input.addGoto || exportable) && <kit.KitGrid density={density} arrange={input.addGoto && exportable ? "grid" : "rows"}>
        {input.addGoto && <kit.KitAction part="add" goto={input.addGoto} label={w.add} kind={empty ? "secondary" : "quiet"} full />}
        {exportable && <kit.KitAction part="export" label={w.export} kind="quiet" full />}
      </kit.KitGrid>}
    </kit.KitContent>}
  </kit.KitCard>;
}
