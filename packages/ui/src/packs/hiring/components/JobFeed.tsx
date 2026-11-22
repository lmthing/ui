import { z } from "zod";
import * as c from "../../../catalog";
import { payPeriods, seedDate, seedGoto, seedRows } from "../seeds";

// Core first: List with a badge trail can link short vacancy rows, but cannot show structured pay,
// workplace, posted age, local bookmarks and easy apply together per opening.
export const meta = {
  id: "JobFeed",
  status: "draft",
  group: "content",
  region: "body",
  weight: 2,
  tier: "phone",
  purpose: "Browse open jobs, compare their pay and workplace, and bookmark openings.",
  pick: "Multiple open jobs with workplace mode, pay and bookmarks. Not short link rows (List), one full opening (JobPost), or tracking jobs already applied to (Applications).",
  realPath: "Openings and bookmarks can live on the phone; external applications need a job-board service.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["place", "posted"] } },
  parts: ["root", "empty", "success", "error"],
  items: {
    key: "jobs",
    parts: [
      "root",
      "title",
      "employer",
      "place",
      "workplace",
      "pay",
      "posted",
      "easy_apply",
      "save",
      "apply",
    ],
    toggles: { save: "saved" },
  },
  partTiers: { apply: "service" },
  actions: {
    items: { root: ["press"], save: ["toggle"], apply: ["press"] },
    when: { apply: { easyApply: true } },
    noGoto: { items: ["apply"] },
  },
  states: ["filled", "empty", "loading", "success", "error"],
  readSuccess: true,
  successActions: ["root.press", "save.toggle", "apply.press"],
  writeHints: [
    "Write one to six open jobs. Give each a distinct jobId, its original posted date and a link to details.",
    "Pay numbers are optional with min at most max; never write a currency, formatted pay, or calculated age.",
    'Use style "cards" only if individual cards are requested. Use detail "brief" only if asked to hide posting dates and locations.',
  ],
} as const satisfies c.Meta;

const job = z.strictObject({
  jobId: c.text(32).meta({ kind: "id" }),
  title: c.text(32),
  employer: c.text(32),
  place: c.text(28).optional(),
  workplace: z.enum(["onsite", "hybrid", "remote"]),
  pay: z
    .strictObject({
      min: z.number().min(0),
      max: z.number().min(0),
      per: z.enum(payPeriods),
    })
    .refine(({ min, max }) => min <= max, { path: ["max"] })
    .optional(),
  easyApply: z.boolean(),
  saved: z.boolean(),
  posted: c.isoDate,
  goto: c.screenId,
});
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  jobs: z
    .array(job)
    .min(1)
    .max(6)
    .refine((rows) => new Set(rows.map(({ jobId }) => jobId)).size === rows.length, "Use unique job IDs"),
  style: z.enum(["rows", "cards"]).default("rows"),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    jobs: seedRows(input, 6).map(({ title, detail }, index) => ({
      jobId: `job_${index + 1}`,
      title: title(32),
      employer: detail(32),
      workplace: "onsite",
      easyApply: false,
      saved: false,
      posted: seedDate,
      goto: seedGoto,
    })),
  };
}

const openings = [
  {
    jobId: "walker",
    title: "Summer dog walker",
    employer: "Trot",
    place: "North Park",
    workplace: "onsite",
    pay: { min: 18, max: 22, per: "hour" },
    easyApply: true,
    saved: false,
    posted: "2026-11-20",
    goto: "walker_post",
  },
  {
    jobId: "editor",
    title: "Copy editor",
    employer: "Harbour Press",
    workplace: "remote",
    easyApply: false,
    saved: true,
    posted: "2026-11-17",
    goto: "editor_post",
  },
] satisfies z.input<typeof job>[];

export const examples: z.input<typeof props>[] = [{ jobs: openings }, { jobs: openings, style: "cards" }];

const { choose, write, read } = c.probesFor("JobFeed");
export const probes = [
  choose("Browse several open jobs by employer, workplace and pay range, and bookmark openings."),
  choose(
    "Show short linked rows with a title, department and chevron. No job terms or save buttons.",
    "List",
  ),
  write(
    "List Trot's Summer dog walker opening, posted 2026-11-20, on-site in North Park, paying 18 to 22 per hour, easy apply on and not saved. Link to walker_post.",
  ),
  {
    ...write(
      "List the open, saved, remote Copy editor job at Harbour Press, posted 2026-11-17, without easy apply. Link to editor_post. Keep the date in the record but hide posting dates and places.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Bookmark the Summer dog walker opening.", { address: "j1/r1/save", action: "toggle" }),
] satisfies c.Probe[];
