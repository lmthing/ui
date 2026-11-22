import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  bindTaskChoices,
  projectTasks,
  taskControls,
  taskCopy,
  taskGroups,
  taskPreviewComplete,
  taskReading,
} from "../copy";
import { projectsWordsFor } from "../lang";
import { acyclic, seedFriday, seedLabels, unique } from "../seeds";
import { prompt } from "../../../entry/prompt-Tasks.generated";

// Core first: Checklist/default cannot show assigned project work with task dependencies or subtasks.
export const meta = {
  id: "Tasks",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Tasks, assignments and dependency links live on the device; assignments on another person's device require a shared app.",
  variants: { group: ["none", "sections"] },
  variantParts: { "group.sections": { adds: ["project"] } },
  parts: ["root", "empty"],
  items: {
    key: "items",
    parts: ["root", "title", "project", "assignee", "due", "priority", "state", "blockers", "done", "assign"],
  },
  states: ["filled", "empty", "loading", "success"],
  actions: {
    items: { root: ["press"], done: ["check"], assign: ["select"] },
    // The host projects this gate from the addressed task's available assignees.
    when: { assign: { canAssign: true } },
  },
  live: { checks: { done: "checked" }, derive: (input) => taskControls(input, []) },
  read: taskReading,
  successActions: ["root.press", "done.check", "assign.select"],
  readSuccess: true,
} as const satisfies c.Meta;

const ref = c.text(32).meta({ kind: undefined });
const task = z.strictObject({
  taskRef: ref,
  projectRef: ref,
  title: c.text(32),
  assignee: c.text(24).optional(),
  due: c.isoDate.optional(),
  priority: z.enum(["normal", "low", "high"]).default("normal"),
  state: z.enum(["todo", "doing", "done"]).optional(),
  parentRef: ref.optional(),
  after: z.array(ref).min(0).max(3),
  goto: c.screenId.optional(),
});
type Task = z.output<typeof task>;

function validTasks(items: Task[]) {
  if (!unique(items.map(({ taskRef }) => taskRef))) return false;
  const byRef = new Map(items.map((row) => [row.taskRef, row]));
  const prerequisites = items.map(({ taskRef, after }) => ({
    taskRef,
    after: [
      ...after,
      ...items.filter(({ parentRef }) => parentRef === taskRef).map(({ taskRef }) => taskRef),
    ],
  }));
  return (
    acyclic(prerequisites) &&
    items.every(({ taskRef, parentRef, projectRef, state, after }) => {
      const parent = parentRef && byRef.get(parentRef);
      if (parentRef === taskRef || (parent && (parent.parentRef || parent.projectRef !== projectRef)))
        return false;
      const isParent = items.some((row) => row.parentRef === taskRef);
      return (
        isParent === (state === undefined) &&
        unique(after) &&
        after.every((ref) => !byRef.has(ref) || byRef.get(ref)!.projectRef === projectRef)
      );
    })
  );
}

// The host supplies local assignee choices for this Tasks instance, not the Writer.
export function bindTasks(choicesFor: (instance: string) => readonly string[]): c.Definition {
  return bindTaskChoices({ props, examples, fallback, probes, meta }, choicesFor);
}

// prettier-ignore
export const props = z
  .strictObject({ ...c.variantProps(meta.variants), items: z.array(task).min(1).max(6) })
  .refine(({ items }) => validTasks(items), {
    path: ["items"],
    message: "Use one level of same-project subtasks and acyclic prerequisites",
  })
  .overwrite((value) => ({ ...value, items: projectTasks(value.items) }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    items: [
      {
        taskRef: "item_1",
        projectRef: "project_1",
        title: seedLabels(input).title,
        state: "todo",
        after: [],
      },
    ],
  };
}

// prettier-ignore
const ledge = { items: [
    { taskRef: "survey", projectRef: "garden", title: "Check balcony light", assignee: "Inez", due: seedFriday, priority: "high", state: "todo", after: [], goto: "survey" },
    { taskRef: "planting", projectRef: "garden", title: "Plan the balcony planting", state: "todo", after: ["survey"] },
  ] } satisfies z.input<typeof props>;
// prettier-ignore
const trot = { items: [
    { taskRef: "guide", projectRef: "route_guide", title: "Prepare route guide", after: [] },
    { taskRef: "map", projectRef: "route_guide", parentRef: "guide", title: "Map the park route", state: "done", after: [] },
    { taskRef: "photos", projectRef: "route_guide", parentRef: "guide", title: "Take crossing photos", priority: "low", state: "doing", after: ["map"] },
    { taskRef: "handout", projectRef: "route_guide", title: "Print the route guide", state: "todo", after: ["guide"] },
    { taskRef: "check", projectRef: "walker_onboarding", title: "Check lead inventory", state: "todo", after: [] },
] } satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  ledge,
  { ...trot, group: "sections" },
  trot,
  { ...trot },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Tasks");
// prettier-ignore
export const probes = [
  choose("Assign work for a launch, give jobs due dates and subtasks, and block design until the research job is done."),
  choose("Give me a short list of separate errands I can tick off independently, with no links between them.", "Checklist"),
  write("For project garden, list assigned task survey, Check balcony light, for Inez, due 2026-11-20, high priority and still to do. Make task planting, Plan the balcony planting, still to do and blocked by survey."),
  {
    ...write("Group assigned work by project. For project route_guide, show Prepare route guide (guide) with its child Map the park route (map), which is done. Show that child indented under the parent."),
    variant: { axis: "group", value: "sections" },
  },
  read("Mark Check balcony light complete.", { address: "t1/r1/done", action: "check" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type ViewRow = View["items"][number] & ReturnType<typeof projectTasks>[number];
// prettier-ignore
function TaskRow({ row, density, lang, indent, loading, choices }: {
  row: ViewRow; density: c.ThemeDensity; lang: string; indent: boolean; loading: boolean; choices: readonly string[];
}) {
  const words = projectsWordsFor(lang).tasks, { state, due, overdue, priority, blockers } = taskCopy(row, lang);
  const controls = loading ? row.done !== undefined && <kit.KitSkeleton lead="box" inset="none" items={[{}]} density={density} /> :
    (row.done !== undefined || row.checked) && <kit.KitCheck part="done" readonly={row.done === undefined} done={!!row.checked} label={words.done(row.title)} />;
  const captions = [due, [state, row.assignee, priority].filter(Boolean).join(words.separator), blockers];
  return <kit.KitRow item={row.id} part={null} label={row.title} trailing={controls} lineRole={due || blockers ? "body" : "heading"} density={density} indent={indent ? 1 : 0}>
    {loading ? [row.title, ...captions].map((text, index) => text &&
      <kit.KitSkeleton key={index} shape="figure" inset="none" density={density} content={[[index ? "caption" : "body", text]]} />) :
    <kit.KitRow part="root" label={row.title} goto={row.goto} inline density={density}><kit.KitText part="title" role="body">{row.title}</kit.KitText>
      {due && <kit.KitText part="due" role="caption" tone={overdue ? "bad" : "muted"}>{due}</kit.KitText>}
      <kit.KitText part={null} role="caption" tone="muted">
        <kit.KitText part="state" role="caption" tone={row.progress === "done" ? "good" : "muted"}>{state}</kit.KitText>
        {row.assignee && <>{words.separator}<kit.KitText part="assignee" role="caption" tone="muted">{row.assignee}</kit.KitText></>}
        {priority && <>{words.separator}<kit.KitText part="priority" role="caption" tone="muted">{priority}</kit.KitText></>}
      </kit.KitText>{blockers && <kit.KitText part="blockers" role="caption" tone="warn">{blockers}</kit.KitText>}
    </kit.KitRow>}
    {!loading && row.canAssign && <kit.KitTrack role="radiogroup" part="assign" label={words.assign(row.title)}>
      {choices.map((name) => <kit.KitChip key={name} item={null} role="radio" label={name} on={name === row.assignee} />)}
    </kit.KitTrack>}
  </kit.KitRow>;
}

// prettier-ignore
export function Tasks(input: View) {
  const { lang, words: { tasks: words } } = kit.useWords(projectsWordsFor), state = kit.useComponentState();
  const { controller } = kit.useKit(), loading = state === "loading";
  const density = kit.useKit().density, group = kit.useVariant("group", meta.variants.group, input.group);
  const { items, assigneeChoices } = kit.useLiveControls(meta, input) as { items: ViewRow[]; assigneeChoices: string[] },
    rows = state === "success" && !controller ? taskPreviewComplete(items) : items;
  const groups = group === "sections" ? taskGroups(rows) : [{ project: undefined, tasks: rows }];
  return <kit.KitCard part="root" density={density}>
    {state === "empty" ? <kit.KitEmpty part="empty" decorativeIcon /> :
      <kit.KitContent>{groups.map(({ project, tasks }) => <kit.KitContent key={project ?? tasks[0]?.id} group={project ? "response" : "content"}>
        {project && <kit.KitContent inset="md">
          {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", words.project(project)]]} /> :
            <kit.KitText role="label" tone="muted" item={tasks[0]?.id} part="project">{words.project(project)}</kit.KitText>}
        </kit.KitContent>}<kit.KitGrid arrange="rows" list density={density}>
          {tasks.map((row, index) => <kit.KitContent key={row.id} group={!row.parentRef && project && tasks[index - 1]?.parentRef ? "response" : "content"}><TaskRow {...{ row, lang, loading }}
            density={project && (row.parentRef || tasks[index + 1]?.parentRef === row.taskRef) ? "compact" : density}
            indent={Boolean(project && row.parentRef)} choices={assigneeChoices} /></kit.KitContent>)}
        </kit.KitGrid></kit.KitContent>)}</kit.KitContent>}</kit.KitCard>;
}
