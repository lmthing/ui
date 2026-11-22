import { z } from "zod";
import * as c from "../../../catalog";
import { activeStages, outcomes, seedDate, seedGoto, seedJobId, seedRows } from "../seeds";
import { prompt } from "../../../entry/prompt-ApplicantPipeline.generated";

// Core first: List/badge can show a stage label but cannot move active applicants across counted hiring stages.
export const meta = {
  id: "ApplicantPipeline",
  status: "draft",
  group: "data",
  ...prompt,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Application records live on the phone and the host moves only active applicants between hiring stages.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "title", "applied", "screening", "interview", "offer", "outcomes"],
  items: {
    key: "applicants",
    parts: ["root", "name", "applied", "next", "next_at"],
    visibleWhen: { outcome: "active" },
  },
  states: ["filled", "empty", "loading", "error"],
  actions: { items: { root: ["press", "move"] }, when: { root: { outcome: "active" } } },
  read: (input, state): string[] => {
    const { applicants } = input as z.output<typeof props>;
    return state === "filled"
      ? applicants.filter(({ outcome }) => outcome === "active").map(({ name, stage }) => `${name}: ${stage}`)
      : [];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  jobId: c.text(32),
  title: c.text(32),
  applicants: z
    .array(
      z.strictObject({
        applicationId: c.text(32),
        name: c.text(24),
        stage: z.enum(activeStages),
        outcome: z.enum(outcomes),
        applied: c.isoDate,
        next: c.text(36).optional(),
        nextAt: c.isoDate.optional(),
        goto: c.screenId,
      }),
    )
    .min(1)
    .max(20)
    .refine(
      (rows) => new Set(rows.map((row) => row.applicationId)).size === rows.length,
      "Use distinct application IDs",
    ),
  style: z.enum(["columns", "stack"]).default("columns"),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const rows = seedRows(input, 3);
  return {
    jobId: seedJobId,
    title: rows[0]!.title(32),
    applicants: rows.map((row, i) => ({
      applicationId: `application_${i + 1}`,
      name: row.title(24),
      stage: "applied",
      outcome: "active",
      applied: seedDate,
      goto: seedGoto,
    })),
  };
}

export const examples: z.input<typeof props>[] = [
  {
    jobId: "walker",
    title: "Summer dog walker",
    applicants: [
      {
        applicationId: "sam",
        name: "Sam Patel",
        stage: "screening",
        outcome: "active",
        applied: "2027-04-06",
        next: "Call about group walks",
        nextAt: "2027-04-10",
        goto: "sam_review",
      },
      {
        applicationId: "riley",
        name: "Riley Chen",
        stage: "interview",
        outcome: "withdrawn",
        applied: "2027-04-05",
        goto: "riley_review",
      },
    ],
  },
  {
    jobId: "baker",
    title: "Morning baker",
    style: "stack",
    density: "compact",
    applicants: [
      {
        applicationId: "mara",
        name: "Mara Kim",
        stage: "offer",
        outcome: "active",
        applied: "2027-05-01",
        goto: "mara_review",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ApplicantPipeline");
export const probes: c.Probe[] = [
  choose(
    "For one job, group applicants into counted stages from applied to offer. Let me move active applicants and take closed applications off the board.",
  ),
  choose(
    "Show the people who applied in one vertical list. Each row has a name, a small status badge and a chevron to open their profile. Keep it flat: no stage groups, counts or moving rows.",
    "List",
  ),
  write(
    "Make a Summer dog walker hiring board. Sam Patel applied 2027-04-06 and is active in screening; next is a call on 2027-04-10. Riley Chen applied 2027-04-05 and withdrew at interview. Link to their reviews.",
  ),
  read("Open Sam Patel's application.", { address: "p1/r1", action: "press" }),
] satisfies c.Probe[];
