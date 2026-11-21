import { z } from "zod";
import * as c from "../../../catalog";
import { activeStages, outcomes, seedApplicationId, seedDate, seedGoto, seedJobId, seedRows } from "../seeds";

const findings = ["unreviewed", "needs_evidence", "meets", "gap"] as const;

// Core first: Profile/card identifies a person but cannot capture criterion-by-criterion application evidence.
export const meta = {
  id: "Candidate",
  status: "draft",
  group: "content",
  purpose: "Review evidence for one job application and record a human hiring decision.",
  pick: "One application with criterion-by-criterion findings and evidence, interview and offer links, and a human decision. Not identity alone (Profile), generic facts (KeyValue), a client summary (ClientCard), or a rating (Scale).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "A human records application evidence and decisions on the phone without sending a message or creating a staff record.",
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"] },
  variantParts: { "detail.brief": { hides: ["evidence"] } },
  parts: [
    "root",
    "name",
    "photo",
    "role",
    "applied",
    "stage",
    "outcome",
    "interview",
    "offer",
    "hire",
    "reject",
    "withdraw",
  ],
  items: {
    key: "criteria",
    parts: ["root", "label", "finding", "evidence"],
    edits: {
      finding: { action: "select", prop: "finding", choices: findings },
      evidence: { action: "type", prop: "evidence", max: 80, empty: "unset" },
    },
  },
  confirmParts: ["reject", "withdraw"],
  states: ["filled", "loading", "success", "error"],
  actions: {
    parts: {
      interview: ["press"],
      offer: ["press"],
      hire: ["press"],
      reject: ["press"],
      withdraw: ["press"],
    },
    items: { finding: ["select"], evidence: ["type"] },
    when: {
      hire: { outcome: "active" },
      reject: { outcome: "active" },
      withdraw: { outcome: "active" },
      evidence: { detail: "full" },
    },
  },
  live: {
    derive: (input) => ({ interview: { goto: input.interviewGoto }, offer: { goto: input.offerGoto } }),
  },
  writeHints: [
    "Findings are explicitly recorded by a human. Default to unreviewed when no finding is supplied; never infer qualifications, assign a score or rank candidates.",
    'For a findings-only view, keep authored evidence in the data and set detail to "brief". Write density null unless the person separately asks for tighter spacing.',
  ],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  applicationId: c.text(32),
  jobId: c.text(32),
  name: c.text(24),
  photo: c.photo.optional(),
  role: c.text(32),
  applied: c.isoDate,
  stage: z.enum(activeStages),
  outcome: z.enum(outcomes),
  criteria: z
    .array(
      z.strictObject({
        label: c.text(32),
        finding: z.enum(findings).default("unreviewed"),
        evidence: c.text(80).optional(),
      }),
    )
    .min(1)
    .max(6),
  interviewGoto: c.screenId,
  offerGoto: c.screenId,
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const [row] = seedRows(input, 1);
  return {
    applicationId: seedApplicationId,
    jobId: seedJobId,
    name: row!.title(24),
    role: row!.detail(32),
    applied: seedDate,
    stage: "applied",
    outcome: "active",
    criteria: [{ label: c.placeholderLabel, finding: "unreviewed" }],
    interviewGoto: seedGoto,
    offerGoto: seedGoto,
  };
}

export const examples: z.input<typeof props>[] = [
  {
    applicationId: "sam",
    jobId: "walker",
    name: "Sam Patel",
    photo: "lib:people",
    role: "Summer dog walker",
    applied: "2027-04-06",
    stage: "interview",
    outcome: "active",
    criteria: [
      { label: "Group handling", finding: "meets", evidence: "Led groups of four at Green Lane Rescue." },
      { label: "Weekday mornings", finding: "needs_evidence" },
    ],
    interviewGoto: "sam_interview",
    offerGoto: "sam_offer",
  },
  {
    applicationId: "mara",
    jobId: "baker",
    name: "Mara Kim",
    detail: "brief",
    density: "compact",
    role: "Morning baker",
    applied: "2027-05-01",
    stage: "offer",
    outcome: "hired",
    criteria: [
      { label: "Bench work", finding: "meets", evidence: "Trial shift included shaping rye loaves." },
    ],
    interviewGoto: "mara_interview",
    offerGoto: "mara_offer",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Candidate");
export const probes: c.Probe[] = [
  choose(
    "Review one job applicant against each required criterion with a finding and evidence, and record the decision myself.",
  ),
  choose(
    "Show only the person's identity, portrait and short bio, with no job application, work-sample review or decision.",
    "Profile",
  ),
  write(
    "Review Sam Patel's active application for Trot's Summer dog walker role, submitted 2027-04-06, now at interview. I marked Group handling as meets based on volunteer walks; Weekday mornings is unreviewed. Link to the interview and offer.",
  ),
  {
    ...write(
      "Summarize Sam Patel's active Summer dog walker application from 2027-04-06 at interview. I marked Group handling as meets based on volunteer walks. Keep that evidence in the record but show just the finding. Link to the interview and offer.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Reject Sam Patel's application.", { address: "c1/reject", action: "press" }),
] satisfies c.Probe[];
