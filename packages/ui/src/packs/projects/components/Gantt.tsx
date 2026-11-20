import { z } from "zod";
import * as c from "../../../catalog";
import { acyclic, dayOf, seedFriday, seedLabels, seedMonday, seedSunday, unique } from "../seeds";

// Core first: Timeline/hours cannot show overlapping multi-day task bars and finish-to-start links.
export const meta = {
  id: "Gantt",
  status: "draft",
  group: "data",
  purpose: "See overlapping task dates, milestone diamonds and finish-to-start dependencies in one project.",
  pick: "Overlapping multi-day task bars and finish-to-start dependencies within one project. Not one day's hour blocks (Timeline), operational columns (Board), or shifts (Roster).",
  writeHints: [
    'Use an inclusive range of 7–90 days, with task start no later than end. Keep original task dates even outside the range; bars are clipped by the app. Use only supplied refs, and use after for finish-to-start links, never for rescheduling. Set style "month" only for week columns instead of day columns.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Scheduled tasks and milestone dates are stored on the device, with dependency links checked for cycles.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "range"],
  items: { key: "targets", parts: ["root", "title", "dates", "after"] },
  states: ["filled", "empty", "loading"],
  actions: { parts: { range: ["select"] }, items: { root: ["press"] } },
  select: { prop: "style", choices: { range: ["week", "month"] } },
  read(input, state): string[] {
    if (state !== "filled") return [];
    const { from, to, tasks, gates } = input as z.output<typeof props>;
    const titles = new Map(tasks.map(({ taskRef, title }) => [taskRef, title]));
    return [
      `${from} – ${to}`,
      ...tasks.map(({ title, start, end, after }) =>
        [title, `${start} – ${end}`, ...after.map((ref) => titles.get(ref) ?? ref)].join(" · "),
      ),
      ...gates.map(({ title, due }) => `${title} · ${due}`),
    ];
  },
} as const satisfies c.Meta;

const ref = c.text(32);
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

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    projectRef: ref,
    from: c.isoDate,
    to: c.isoDate,
    tasks: z.array(task).min(1).max(12),
    gates: z.array(gate).min(0).max(6),
    style: z.enum(["week", "month"]).default("week"),
  })
  .refine(({ from, to }) => dayOf(to) - dayOf(from) >= 6 && dayOf(to) - dayOf(from) < 90, {
    path: ["to"],
    message: "Choose an inclusive range of 7–90 days",
  })
  .refine(({ tasks }) => unique(tasks.map(({ taskRef }) => taskRef)) && acyclic(tasks), {
    path: ["tasks"],
    message: "Use distinct task refs and acyclic dependencies",
  })
  .overwrite((value) => ({
    ...value,
    targets: [
      ...value.tasks.map((task) => ({ ...task, kind: "task", root: task.goto })),
      ...value.gates.map((gate) => ({ ...gate, kind: "gate", root: gate.goto })),
    ],
  }));

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
export const examples = [
  { projectRef: "garden", from: seedMonday, to: seedSunday,
    tasks: [
      { taskRef: "survey", title: "Check balcony light", start: seedMonday, end: "2026-11-17", after: [], goto: "survey" },
      { taskRef: "planting", title: "Plan the balcony planting", start: "2026-11-18", end: seedFriday, after: ["survey"] },
    ],
    gates: [{ title: "Plan ready", due: seedFriday, goto: "garden_scope" }] },
  { projectRef: "route_guide", style: "month", density: "compact", from: "2026-11-01", to: "2026-11-30",
    tasks: [{ taskRef: "map", title: "Map the park route", start: "2026-10-29", end: "2026-11-10", after: [] }],
    gates: [{ title: "Guide ready to print", due: "2026-11-27" }] },
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
  read("Open the scheduled task Check balcony light.", { address: "g1/r1", action: "press" }),
] satisfies c.Probe[];
