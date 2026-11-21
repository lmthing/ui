import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { seedTitles } from "..";
import { planCount, planDay, planOrder, planReading, planView } from "../copy";
import { healthWordsFor } from "../lang";

// Core first: Checklist/default ticks tasks but cannot switch workout weeks, show rest days or launch linked sessions.
// prettier-ignore
export const meta = {
  id: "TrainingPlan", status: "draft", group: "input",
  purpose: "Follow a multi-week workout plan, track completion and start scheduled sessions.",
  pick: "A multi-week workout program with week and day numbers, workout duration, rest days, and completion. Not one active strength session (Workout), repeated habits (HabitGrid), a course path (Path), or ungrouped tasks to tick off (Checklist).",
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "The program and workout completion marks are stored on the device.",
  writeHints: [
    "Use Monday = day 1 through Sunday = day 7. Each week/day pair is unique and in the plan; set rest true only for rest days. Leave goto null unless a workout screen was supplied. Progress counts are derived.",
    'Use style "list" to show all weeks in sequence; otherwise leave style null. If asked to hide workout durations, keep minutes in the data and write {"detail":"brief","density":null,"surface":null} without overriding density or surface.',
  ],
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["minutes"] } },
  parts: ["root", "title", "week", "progress", "progress_bar", "week_progress", "notice", "sub", "empty_week"],
  items: { key: "days", parts: ["root", "label", "day", "minutes", "rest", "done", "trail"], visibleWhen: { visible: true } },
  states: ["filled", "empty", "loading", "success", "error"],
  selections: { week: { prop: "currentWeek", choices: { prop: "weekChoices" } } },
  live: { checks: { done: "done" }, derive: (p) => planView(p as Parameters<typeof planView>[0]) },
  readSuccess: true,
  successActions: ["week.select", "done.check", "root.press"],
  read: (p, state, lang) => planReading(p as Parameters<typeof planReading>[0], state, lang),
  actions: { parts: { week: ["select"] }, items: { done: ["check"], root: ["press"] },
    when: { week: { canSelectWeek: true }, done: { rest: false }, root: { opens: true } } },
} as const satisfies c.Meta;

const week = z.int().min(1).max(12);
// prettier-ignore
const day = z.strictObject({
  week, day: z.int().min(1).max(7), label: c.text(24), minutes: z.int().min(0).max(240),
  rest: z.boolean(), done: z.boolean(), goto: c.screenId.optional(),
}).overwrite((d) => ({ ...d, opens: !d.rest && Boolean(d.goto) }));

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), title: c.text(32), weeks: week, currentWeek: week, days: z.array(day).min(1).max(28),
  style: z.enum(["week", "list"]).default("week"),
}).refine(({ currentWeek, weeks }) => currentWeek <= weeks, { path: ["currentWeek"], message: "Select a week in the plan" })
  .refine(({ days, weeks }) => days.every((item) => item.week <= weeks) &&
    new Set(days.map((item) => item.week * 7 + item.day)).size === days.length,
    { path: ["days"], message: "Each week and day pair must be unique and inside the plan" })
  .overwrite((p) => ({ ...p, ...planView(p) }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const labels = seedTitles(cast, 3, 24, lang);
  return {
    title: seedTitles(cast, 1, 32, lang)[0]!,
    weeks: 1,
    currentWeek: 1,
    days: labels.map((label, index) => ({
      week: 1,
      day: index + 1,
      label,
      minutes: 0,
      rest: false,
      done: false,
    })),
  };
}

// prettier-ignore
export const examples = [
  { title: "Garden trail stamina", weeks: 3, currentWeek: 1, days: [
    { week: 1, day: 1, label: "Easy trail walk", minutes: 25, rest: false, done: true, goto: "trail_walk" },
    { week: 1, day: 2, label: "Recovery", minutes: 0, rest: true, done: false },
    { week: 1, day: 3, label: "Hill intervals", minutes: 30, rest: false, done: false, goto: "hill_intervals" },
    { week: 1, day: 5, label: "Lower-body strength", minutes: 35, rest: false, done: false, goto: "strength" },
    { week: 1, day: 7, label: "Steady trail walk", minutes: 40, rest: false, done: false },
    { week: 2, day: 1, label: "Easy trail walk", minutes: 30, rest: false, done: false },
    { week: 2, day: 4, label: "Hill intervals", minutes: 35, rest: false, done: false, goto: "hill_intervals" },
    { week: 3, day: 1, label: "Long trail walk", minutes: 50, rest: false, done: false },
  ] },
  { title: "Build up with Clover", weeks: 2, currentWeek: 2, style: "list", density: "compact", days: [
    { week: 1, day: 1, label: "Park loop", minutes: 20, rest: false, done: true },
    { week: 1, day: 4, label: "River walk", minutes: 25, rest: false, done: true },
    { week: 2, day: 1, label: "River walk", minutes: 30, rest: false, done: false, goto: "river_walk" },
    { week: 2, day: 2, label: "Recovery", minutes: 0, rest: true, done: false },
    { week: 2, day: 5, label: "Long park loop", minutes: 35, rest: false, done: false },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("TrainingPlan");
// prettier-ignore
export const probes = [
  choose("Organize my 6-week workout program by training week and weekday, with session durations, rest days and a tick when each workout is finished"),
  choose("Give me checkboxes for three errands I need to finish today, with no schedule or links", "Checklist"),
  write("Title: Trail build-up. Show weeks one and two of the workout program, starting on week one. Monday of week one is an easy walk for 25 minutes, already done. Tuesday of week one is a rest day. Monday of week two is an easy walk for 30 minutes, not done."),
  { ...write("Create a two-week Trail build-up program on week one. Schedule Easy walk, 25 minutes, not done, for the first Monday and Long walk, 40 minutes, not done, for the second Monday. Keep both durations in the plan but don't display them. Leave row spacing and card borders unchanged."),
    variant: { axis: "detail", value: "brief" } },
  read("Mark Hill intervals on Wednesday complete, without opening its workout", { address: "p1/r3/done", action: "check" }),
] satisfies c.Probe[];

type Seed = c.Props<typeof props, typeof meta>;
type Day = Seed["days"][number] & { visible: boolean; opens: boolean };
type View = Omit<Seed, "days"> & ReturnType<typeof planView<Day>>;
type Words = ReturnType<typeof healthWordsFor>["training"];

// prettier-ignore
function Program({ p, w, lang, loading }: { p: View; w: Words; lang: string; loading: boolean }) {
  const { count, done } = p.programProgress;
  const progress = count ? w.count(c.numberLine(done, lang), c.numberLine(count, lang)) : w.noWorkouts;
  return <kit.KitContent density={p.density}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["heading", p.title]]} />
      : <kit.KitText part="title" role="heading">{p.title}</kit.KitText>}
    <kit.KitGrid fitLast>{loading
      ? [<kit.KitSkeleton key="label" shape="figure" inset="none" content={[["label", w.program]]} />,
         <kit.KitSkeleton key="value" shape="figure" inset="none" content={[["number", progress, "end", "compact"]]} />]
      : [<kit.KitText key="label" part={null} role="label" tone="muted">{w.program}</kit.KitText>,
         <kit.KitText key="value" part="progress" role={count ? "number" : "label"} numberScale="compact" tabular>{progress}</kit.KitText>]}
    </kit.KitGrid>
    {count > 0 && <kit.KitStepsTrack part="progress_bar" style="bar" count={count} at={loading ? 0 : done} />}
  </kit.KitContent>;
}

// prettier-ignore
function Schedule({ p, w, lang, loading }: { p: View; w: Words; lang: string; loading: boolean }) {
  const rows = planOrder(p.days.filter((day) => day.visible));
  const weeks = p.style === "week" ? [p.currentWeek] : [...new Set(rows.map(({ week }) => week))];
  return weeks.map((week) => {
    const days = rows.filter((day) => day.week === week);
    const heading = w.line([w.week(c.numberLine(week, lang)), planCount(p.weeklyProgress[week - 1]!, lang)]);
    return <kit.KitContent key={week} group="response" density={p.density}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", heading]]} />
        : <kit.KitText part={p.style === "week" ? "week_progress" : null} role="label" tone="muted">{heading}</kit.KitText>}
      <kit.KitGrid list arrange="rows" density={p.density}>
        {days.map((d) => <ScheduleDay key={d.id} {...{ d, w, lang, loading }} p={p} />)}
      </kit.KitGrid>
      {!days.length && !loading && <kit.KitText part="empty_week" tone="muted">{w.emptyWeek}</kit.KitText>}
    </kit.KitContent>;
  });
}

// prettier-ignore
function ScheduleDay({ d, p, w, lang, loading }: { d: Day; p: View; w: Words; lang: string; loading: boolean }) {
  const { weekday, minutes } = planDay(d, p.detail, lang);
  const goto = d.opens ? d.goto : undefined;
  const secondary = d.rest ? w.rest : minutes;
  return <kit.KitRow item={d.id} part={loading ? null : "root"} label={d.label} inset="none"
    goto={loading ? undefined : goto} density={p.density}
    leadingWidth="avatar"
    leading={loading ? <kit.KitSkeleton shape="figure" inset="none" lead="box" />
      : d.rest ? <kit.KitIcon name="moon" tone="muted" decorative />
      : <kit.KitCheck part="done" done={d.done} label={w.check(d.label)} />}
    trailing={!loading && goto && <kit.KitTrail part="trail" kind="chevron" />}>
    {loading ? <>
      <kit.KitSkeleton shape="figure" inset="none" density={p.density} content={[["body", d.label]]} />
      <kit.KitSkeleton shape="figure" inset="none" density={p.density}
        content={[["caption", w.line(secondary ? [weekday, secondary] : [weekday])]]} />
    </>
    : <><kit.KitText part="label" role="body" density={p.density}>{d.label}</kit.KitText>
    <kit.KitText part={d.rest ? "rest" : minutes ? "minutes" : null} role="caption" tone="muted" density={p.density}>
      <kit.KitText part="day" role="caption" tone="muted" density={p.density}>{weekday}</kit.KitText>
      {secondary && w.line(["", secondary])}
    </kit.KitText></>}
  </kit.KitRow>;
}

// prettier-ignore
export function TrainingPlan(input: Seed) {
  const p = kit.useLiveControls(meta, input) as View;
  const state = kit.useComponentState();
  const { lang, words: { training: w } } = kit.useWords(healthWordsFor);
  const density = kit.useVariant("density", meta.variants.density, p.density);
  const surface = kit.useVariant("surface", meta.variants.surface, p.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, p.detail);
  const loading = state === "loading", view = { ...p, density, detail };
  return <kit.KitCard padded part="root" {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty decorativeIcon />
      : state === "error" ? <kit.KitEmpty icon="alert" decorativeIcon title={w.error} sub={w.errorDetail} />
      : <>
        {state === "success" && <kit.KitText part="notice" role="label" tone="good">{w.success}</kit.KitText>}
        <Program p={view} {...{ w, lang, loading }} />
        {p.canSelectWeek && <kit.KitTrack part="week" role="radiogroup" label={w.weeks}>
          {p.weekChoices.map(({ value, label }) =>
            <kit.KitChip key={value} item={null} look="box" role="radio" disabled={false} value={label}
              label={w.week(c.numberLine(value, lang))} on={value === p.currentWeek} />)}
        </kit.KitTrack>}
        <Schedule p={view} {...{ w, lang, loading }} />
      </>}
  </kit.KitCard>;
}
