import { appointmentDate, text, type Definition, type StateName, type Values } from "../../../catalog";
import { projectsWordsFor } from "../lang";

type Progress = "todo" | "doing" | "done";
type Task = {
  taskRef: string;
  projectRef: string;
  title: string;
  assignee?: string | undefined;
  due?: string | undefined;
  priority: "normal" | "low" | "high";
  state?: Progress | undefined;
  parentRef?: string | undefined;
  after: readonly string[];
  goto?: string | undefined;
  checked?: boolean | undefined;
};

function taskGraph(tasks: readonly Task[]) {
  const byRef = new Map(tasks.map((row) => [row.taskRef, row]));
  function progress(row: Task, reopened?: string): Progress {
    if (row.state !== undefined) {
      if (row.taskRef === reopened) return "todo";
      return (row.checked ?? row.state === "done") ? "done" : row.state === "doing" ? "doing" : "todo";
    }
    const children = tasks.filter(({ parentRef }) => parentRef === row.taskRef);
    if (children.every((child) => progress(child, reopened) === "done")) return "done";
    return children.some((child) => progress(child, reopened) !== "todo") ? "doing" : "todo";
  }
  const blocked = (row: Task, reopened?: string) =>
    row.after.filter((ref) => !byRef.has(ref) || progress(byRef.get(ref)!, reopened) !== "done");
  return { byRef, progress, blocked };
}

export function projectTasks<T extends Task>(items: readonly T[], choices: readonly string[] = []) {
  const { byRef, progress, blocked } = taskGraph(items);
  return items.map((row) => {
    const blockers = blocked(row);
    const checked = row.state === undefined ? undefined : progress(row) === "done";
    const locked =
      checked &&
      items.some(
        (other) => progress(other) === "done" && blocked(other, row.taskRef).length > blocked(other).length,
      );
    return {
      ...row,
      root: row.goto,
      assign: {},
      canAssign: choices.length > 0,
      checked,
      done: blockers.length || locked ? undefined : checked,
      progress: progress(row),
      blockers: blockers.map((ref) => byRef.get(ref)?.title ?? ref),
    };
  });
}

type ProjectedTask = ReturnType<typeof projectTasks>[number];

const assigneeName = text(24);
export function taskControls(input: Readonly<Values>, choices: readonly string[]) {
  const assigneeChoices = [
    ...new Set(
      choices.flatMap((name) => {
        const parsed = assigneeName.safeParse(name);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  ];
  return { assigneeChoices, items: projectTasks(input.items as Task[], assigneeChoices) };
}

/** Bind local host choices without adding assignee options to Writer input. */
export function bindTaskChoices(
  definition: Definition,
  choicesFor: (instance: string) => readonly string[],
): Definition {
  const { meta } = definition;
  if (!meta.items) return definition;
  return {
    ...definition,
    meta: {
      ...meta,
      items: {
        ...meta.items,
        edits: { assign: { action: "select", prop: "assignee", choices: { prop: "assigneeChoices" } } },
      },
      live: { ...meta.live, derive: (input, id) => taskControls(input, choicesFor(id)) },
    },
  };
}

export function taskGroups<T extends { taskRef: string; projectRef: string; parentRef?: string | undefined }>(
  rows: readonly T[],
) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    if (!groups.has(row.projectRef)) groups.set(row.projectRef, []);
    groups.get(row.projectRef)!.push(row);
  }
  return [...groups].map(([project, tasks]) => ({
    project,
    tasks: tasks.flatMap((row) =>
      row.parentRef && tasks.some((parent) => parent.taskRef === row.parentRef)
        ? []
        : [row, ...tasks.filter((child) => child.parentRef === row.taskRef)],
    ),
  }));
}

export function taskCopy(row: ProjectedTask, lang?: string, now = new Date()) {
  const words = projectsWordsFor(lang).tasks;
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((value, index) => String(value).padStart(index ? 2 : 4, "0"))
    .join("-");
  const overdue = row.due !== undefined && row.progress !== "done" && row.due < today;
  const date = row.due && appointmentDate(row.due, lang);
  return {
    overdue,
    due: date && (overdue ? words.overdue(date) : words.due(date)),
    state: words.state[row.progress],
    priority: row.priority === "normal" ? undefined : words.priority[row.priority],
    blockers: row.blockers.length ? words.blockers(row.blockers) : undefined,
  };
}

export function taskLoading(rows: readonly ProjectedTask[], lang?: string) {
  const { separator } = projectsWordsFor(lang).tasks;
  return rows.map((row) => {
    const { due, state, priority, blockers } = taskCopy(row, lang);
    const captions = [due, [state, row.assignee, priority].filter(Boolean).join(separator), blockers];
    return {
      lines: [
        { role: "body" as const, text: row.title },
        ...captions.flatMap((text) => (text ? [{ role: "caption" as const, text }] : [])),
      ],
      done: row.done !== undefined,
    };
  });
}

export function taskReading(input: unknown, state: StateName, lang?: string) {
  if (state !== "filled" && state !== "success") return [];
  const { items, group } = input as { items: ProjectedTask[]; group: string };
  const groups = group === "sections" ? taskGroups(items) : [{ project: undefined, tasks: items }];
  const words = projectsWordsFor(lang).tasks;
  return groups.flatMap(({ project, tasks }) => [
    ...(project ? [words.project(project)] : []),
    ...tasks.map((row) => {
      const { due, priority, state, blockers } = taskCopy(row, lang);
      return [row.title, row.assignee, due, priority, state, blockers].filter(Boolean).join(words.separator);
    }),
  ]);
}
