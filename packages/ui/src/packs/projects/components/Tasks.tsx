import { z } from "zod";
import * as c from "../../../catalog";
import { acyclic, seedFriday, seedLabels, unique } from "../seeds";

// Core first: Checklist/default cannot show assigned project work with task dependencies or subtasks.
export const meta = {
  id: "Tasks",
  status: "draft",
  group: "input",
  purpose: "Track assigned project tasks, their subtasks, due dates and blockers.",
  pick: "Assigned deliverable work with subtasks or dependencies. Not independent jobs (Checklist), operational columns (Board), or graded coursework (Assignments).",
  writeHints: [
    'Use only supplied record refs. Include state "todo", "doing" or "done" on leaves; omit it on parents with children. Each subtask is directly under a parent in the same project. Use after for prerequisite task refs, not parentRef.',
    'Use group "sections" to group by project and indent children; leave group null otherwise. Do not write blocker, overdue or completion summaries.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Tasks, assignments and dependency links live on the device; assignments on another person's device require a shared app.",
  variants: { density: ["comfortable", "compact"], group: ["none", "sections"] },
  variantParts: { "group.sections": { adds: ["project"] } },
  parts: ["root"],
  items: {
    key: "items",
    parts: ["root", "title", "project", "assignee", "due", "priority", "state", "blockers", "done", "assign"],
  },
  states: ["filled", "empty", "loading", "success"],
  actions: { items: { root: ["press"], done: ["check"], assign: ["select"] } },
  successActions: ["root.press", "done.check", "assign.select"],
  readSuccess: true,
} as const satisfies c.Meta;

const ref = c.text(32);
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

function projectedTasks(items: Task[]) {
  const stateOf = (row: Task) => {
    const children = items.filter(({ parentRef }) => parentRef === row.taskRef);
    if (!children.length) return row.state;
    if (children.every(({ state }) => state === "done")) return "done";
    return children.some(({ state }) => state !== "todo") ? "doing" : "todo";
  };
  const byRef = new Map(items.map((row) => [row.taskRef, row]));
  return items.map((row) => {
    const blockers = row.after.filter((ref) => {
      const prerequisite = byRef.get(ref);
      return !prerequisite || stateOf(prerequisite) !== "done";
    });
    return {
      ...row,
      root: row.goto,
      // Absence suppresses the check; false is a visible unchecked control.
      done: row.state !== undefined && !blockers.length ? row.state === "done" : undefined,
      blockers: blockers.map((ref) => byRef.get(ref)?.title ?? ref),
      state: stateOf(row),
    };
  });
}

export const props = z
  .strictObject({ ...c.variantProps(meta.variants), items: z.array(task).min(1).max(6) })
  .refine(({ items }) => validTasks(items), {
    path: ["items"],
    message: "Use one level of same-project subtasks and acyclic prerequisites",
  })
  .overwrite((value) => ({ ...value, items: projectedTasks(value.items) }));

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
export const examples = [
  { items: [
    { taskRef: "survey", projectRef: "garden", title: "Check balcony light", assignee: "Inez", due: seedFriday, priority: "high", state: "todo", after: [], goto: "survey" },
    { taskRef: "planting", projectRef: "garden", title: "Plan the balcony planting", state: "todo", after: ["survey"] },
  ] },
  { group: "sections", density: "compact", items: [
    { taskRef: "guide", projectRef: "route_guide", title: "Prepare route guide", after: [] },
    { taskRef: "map", projectRef: "route_guide", parentRef: "guide", title: "Map the park route", state: "done", after: [] },
    { taskRef: "photos", projectRef: "route_guide", parentRef: "guide", title: "Take crossing photos", priority: "low", state: "doing", after: ["map"] },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Tasks");
export const probes = [
  choose(
    "Assign work for a launch, give jobs due dates and subtasks, and block design until the research job is done.",
  ),
  choose(
    "Give me a short list of separate errands I can tick off independently, with no links between them.",
    "Checklist",
  ),
  write(
    "For project garden, list assigned task survey, Check balcony light, for Inez, due 2026-11-20, high priority and still to do. Make task planting, Plan the balcony planting, still to do and blocked by survey.",
  ),
  {
    ...write(
      "Group assigned work by project. For project route_guide, show Prepare route guide (guide) with its child Map the park route (map), which is done. Show that child indented under the parent.",
    ),
    variant: { axis: "group", value: "sections" },
  },
  read("Mark Check balcony light complete.", { address: "t1/r1/done", action: "check" }),
] satisfies c.Probe[];
