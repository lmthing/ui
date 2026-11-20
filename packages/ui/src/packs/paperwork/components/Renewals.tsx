import { z } from "zod";
import * as c from "../../../catalog";
import { seedDate, seedRows } from "../seeds";

// Core first: Calendar/week shows marked days, not distinct notice and end dates with a dated completion.
export const meta = {
  id: "Renewals",
  status: "draft",
  group: "data",
  purpose: "Act on obligations before their notice or expiry dates.",
  pick: "Act on administrative renewals with separate notice and end dates, dated completion and local reminders. Not dates alone (Calendar), filing expiring documents (Documents), recurring payments (Bills), routine care (CareSchedule) or purchase warranties (Warranties).",
  writeHints: [
    "Use actual dates in YYYY-MM-DD. noticeBy cannot be later than due. Omit completedOn unless a real completion date was supplied. Never write derived warnings or completion flags.",
    'Use style "cards" only for separate cards naming both dates; otherwise leave style null. Leave density and surface null unless requested.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Deadline and completion dates stay on device and local reminders need permission; the renewal itself happens outside the tracker.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "empty", "success"],
  items: {
    key: "items",
    parts: [
      "root",
      "title",
      "for",
      "due",
      "notice_by",
      "completed_on",
      "warning",
      "done",
      "remind",
      "remove",
    ],
  },
  states: ["filled", "empty", "loading", "success"],
  partTiers: { remind: "ok" },
  confirmParts: ["remove"],
  successActions: ["root.press", "done.check", "remove.press"],
  readSuccess: true,
  actions: {
    items: { root: ["press"], done: ["check"], remind: ["press"], remove: ["press"] },
    noGoto: { items: ["remind", "remove"] },
    when: { remind: { complete: false } },
  },
  read: (input): string[] =>
    (input as z.output<typeof props>).items.flatMap(({ due, noticeBy, completedOn }) =>
      [due, noticeBy, completedOn].filter((line): line is string => Boolean(line)),
    ),
} as const satisfies c.Meta;

const renewal = z
  .strictObject({
    title: c.text(32),
    for: c.text(24).optional(),
    due: c.isoDate,
    noticeBy: c.isoDate.optional(),
    completedOn: c.isoDate.optional(),
    goto: c.screenId.optional(),
  })
  .refine(({ due, noticeBy }) => !noticeBy || noticeBy <= due, {
    path: ["noticeBy"],
    message: "Notice date must be on or before the due date",
  })
  .overwrite((row) => ({ ...row, complete: Boolean(row.completedOn) }));

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  items: z.array(renewal).min(1).max(6),
  style: z.enum(["due", "cards"]).default("due"),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { items: seedRows(input, 32, 24).map(({ title }) => ({ title, due: seedDate })) };
}

export const examples = [
  {
    items: [
      { title: "Greenhouse permit", for: "Mina", noticeBy: "2027-03-10", due: "2027-04-10", goto: "permit" },
      { title: "Garden plot agreement", for: "Mina", due: "2027-04-30" },
    ],
  },
  {
    style: "cards",
    density: "compact",
    surface: "plain",
    items: [
      {
        title: "Trot liability cover",
        for: "Alex",
        noticeBy: "2027-01-12",
        due: "2027-02-01",
        completedOn: "2027-01-09",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Renewals");
export const probes = [
  choose(
    "My licence ends in April but I have to give notice in March. Keep both dates, let me mark when I renewed it, and remind me in time.",
  ),
  choose("Show a week grid with marked days. I just want to see which dates are busy.", "Calendar"),
  write(
    "Track Mina's greenhouse permit renewal. Decide by 2027-03-10, it ends on 2027-04-10, and she hasn't completed it.",
  ),
  {
    ...write(
      "Show the greenhouse permit renewal, notice on 2027-03-10 and end date 2027-04-10. Use shorter rows with less vertical spacing so more deadlines fit on screen.",
    ),
    variant: { axis: "density", value: "compact" },
  },
  read("Ask for a reminder for the greenhouse permit.", { address: "r1/r1/remind", action: "press" }),
] satisfies c.Probe[];
