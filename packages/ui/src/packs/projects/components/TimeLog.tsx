import { z } from "zod";
import * as c from "../../../catalog";
import { dayOf, seedLabels, seedMonday } from "../seeds";

// Core first: Timer/up cannot save task-linked time entries or show a week's work records.
export const meta = {
  id: "TimeLog",
  status: "draft",
  group: "input",
  purpose: "Save timed work entries and review billable and non-billable time by day.",
  pick: "A saved work log of individual project or task time entries, billable marks, and totals. Not a single unsaved elapsed clock (Timer), staff clock-in (TimeClock), or payroll approval (Timesheet).",
  writeHints: [
    "Week is a Monday. Use ISO date-times expressed in the log's local time with its UTC offset (Z only for UTC), with end after start and no overlap. Entries must fit the selected local week. Use projectRef on each entry and when setting a current taskRef. Do not write durations, totals or running states.",
    'Use style "single_day" for one selected day in the week and give that day as day; supply at most six entries and leave day null for style "days". To hide notes, set only detail to "brief" and retain notes in the data. Leave density null unless tighter rows are explicitly requested, even when detail or style is set.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Timestamped work entries are stored on the device; export opens the phone share sheet without submitting payroll.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["note"] } },
  parts: ["root", "week", "day", "day_total", "week_total", "timer", "add", "export"],
  items: {
    key: "entries",
    visibleWhen: { visible: true },
    parts: ["root", "title", "start", "end", "duration", "billable", "note", "remove"],
  },
  confirmParts: ["remove"],
  partTiers: { export: "service" },
  states: ["filled", "empty", "loading", "success"],
  actions: {
    parts: { timer: ["start", "stop"], add: ["press"], export: ["press"] },
    items: { root: ["press"], remove: ["press"] },
    when: { "timer.start": { hasTarget: true }, export: { hasEntries: true } },
  },
  clocks: [
    {
      id: "elapsed",
      kind: "up",
      start: { part: "timer", action: "start" },
      stop: { part: "timer", action: "stop" },
    },
  ],
  emptyActions: ["timer.start", "timer.stop", "add.press"],
  successActions: ["timer.start", "timer.stop", "add.press", "export.press", "root.press", "remove.press"],
  readSuccess: true,
  live: {
    derive(input): Record<string, unknown> {
      if (input.detail !== "brief" || !Array.isArray(input.entries)) return {};
      return { entries: input.entries.map((row: object) => ({ ...row, note: undefined })) };
    },
  },
} as const satisfies c.Meta;

const ref = c.text(32);
const isoOffset = z.iso.datetime({ offset: true });
const timestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/)
  .refine((value) => isoOffset.safeParse(value).success && Number.isFinite(Date.parse(value)));
const entry = z.strictObject({
  projectRef: ref,
  taskRef: ref.optional(),
  title: c.text(32),
  start: timestamp,
  end: timestamp,
  billable: z.boolean(),
  note: c.text(36).optional(),
  goto: c.screenId.optional(),
});

const schema = z.strictObject({
  ...c.variantProps(meta.variants),
  week: c.isoDate,
  entries: z.array(entry).min(0).max(14),
  projectRef: ref.optional(),
  taskRef: ref.optional(),
  addGoto: c.screenId.optional(),
  day: c.isoDate.optional(),
  style: z.enum(["days", "single_day"]).default("days"),
});

const endsAtMidnight = (end: string) => /^00:00:00(?:\.0+)?(?:Z|[+-])/.test(end.slice(11));

// The wire seed carries local wall time and its offset, not the host's time-zone identifier.
function fitsWeek(week: string, start: string, end: string) {
  const first = dayOf(week);
  const startDay = dayOf(start.slice(0, 10));
  const endDay = dayOf(end.slice(0, 10));
  return (
    startDay >= first &&
    startDay < first + 7 &&
    endDay >= first &&
    (endDay < first + 7 || (endDay === first + 7 && endsAtMidnight(end)))
  );
}

function validEntries({ week, entries }: z.output<typeof schema>) {
  const sorted = [...entries].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return sorted.every(
    ({ start, end }, index) =>
      fitsWeek(week, start, end) &&
      Date.parse(start) < Date.parse(end) &&
      (!index || Date.parse(sorted[index - 1]!.end) <= Date.parse(start)),
  );
}

export const props = schema
  .refine(({ week }) => new Date(`${week}T00:00:00Z`).getUTCDay() === 1, {
    path: ["week"],
    message: "The week starts on Monday",
  })
  .refine(({ taskRef, projectRef }) => !taskRef || !!projectRef, {
    path: ["projectRef"],
    message: "A task timer needs a project",
  })
  .refine(
    ({ style, entries, day, week }) =>
      style === "single_day"
        ? !!day && dayOf(day) >= dayOf(week) && dayOf(day) < dayOf(week) + 7 && entries.length <= 6
        : day === undefined,
    { path: ["day"], message: "Single-day logs need one day in the selected week and at most six entries" },
  )
  .refine(validEntries, {
    path: ["entries"],
    message: "Entries must fit the week, have positive duration and not overlap",
  })
  .overwrite((value) => ({
    ...value,
    hasTarget: value.projectRef !== undefined,
    hasEntries: value.entries.length > 0,
    add: value.addGoto ? { goto: value.addGoto } : undefined,
    entries: value.entries.map((entry) => ({
      ...entry,
      root: entry.goto,
      visible:
        !value.day ||
        (value.day >= entry.start.slice(0, 10) &&
          (value.day < entry.end.slice(0, 10) ||
            (value.day === entry.end.slice(0, 10) && !endsAtMidnight(entry.end)))),
    })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    week: seedMonday,
    projectRef: "project_1",
    entries: [
      {
        projectRef: "project_1",
        title: seedLabels(input).title,
        billable: false,
        start: `${seedMonday}T09:00:00Z`,
        end: `${seedMonday}T09:30:00Z`,
      },
    ],
  };
}

// prettier-ignore
export const examples = [
  { week: seedMonday, projectRef: "garden", taskRef: "survey", addGoto: "new_time",
    entries: [{ projectRef: "garden", taskRef: "survey", title: "Check balcony light", billable: false,
      start: "2026-11-16T09:00:00+01:00", end: "2026-11-16T09:30:00+01:00", note: "Measured morning sun", goto: "survey_time" }] },
  { week: seedMonday, style: "single_day", day: "2026-11-19", density: "compact", detail: "brief", projectRef: "route_guide",
    entries: [{ projectRef: "route_guide", title: "Draw park route", billable: true,
      start: "2026-11-19T14:00:00Z", end: "2026-11-19T15:15:00Z", note: "Drafted two route options" }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("TimeLog");
export const probes = [
  choose(
    "Save each stretch of work against its project and task, mark it billable or not, and see day and week totals.",
  ),
  choose(
    "I only want a stopwatch that counts upward for one activity now. Don't save or group sessions.",
    "Timer",
  ),
  write(
    "Show a saved non-billable entry Check balcony light for project garden and task survey from 09:00 to 09:30 on 2026-11-16 at UTC+01:00, week of 2026-11-16. The current timer targets garden and survey. Link manual entry to new_time.",
  ),
  {
    ...write(
      "For the week of 2026-11-16, show a saved billable Draw park route entry for project route_guide on Nov 19 from 14:00 to 15:15 UTC. Store the note Drafted two route options but hide the notes from the display.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the manual time entry form.", { address: "t1/add", action: "press" }),
] satisfies c.Probe[];
