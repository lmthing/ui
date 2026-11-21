import { z } from "zod";
import * as c from "../../../catalog";
import { activeStages, outcomes, seedDate, seedGoto, seedRows } from "../seeds";

// Core first: List/badge shows status but cannot track and log a dated follow-up on a job application.
export const meta = {
  id: "Applications",
  status: "draft",
  group: "data",
  purpose: "Track my job applications and log the follow-ups I owe.",
  pick: "A job seeker's applications to multiple employers with dated next actions, follow-up logging and application history. Not employers reviewing people (ApplicantPipeline), a general list (List), or a simple checklist (Checklist).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Applications and contact events live on the seeker's phone, and checking a follow-up logs and clears it without sending or changing stage.",
  variants: { surface: ["plain", "card"], density: ["comfortable", "compact"] },
  parts: ["root"],
  items: {
    key: "applications",
    parts: [
      "root",
      "role",
      "employer",
      "stage",
      "outcome",
      "applied",
      "last_contact",
      "next",
      "next_at",
      "due",
      "followup",
      "withdraw",
    ],
  },
  confirmParts: ["withdraw"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { root: ["press"], followup: ["check"], withdraw: ["press"] },
    when: { followup: { followUp: "pending" }, withdraw: { outcome: "active" } },
    noGoto: { items: ["withdraw"] },
  },
  live: {
    derive: ({ applications }): c.Values => ({
      applications: (applications as z.output<typeof props>["applications"]).map((row) => ({
        ...row,
        followUp: row.outcome === "active" && row.next !== undefined ? "pending" : "none",
      })),
    }),
  },
  writeHints: [
    "Leave applied absent for saved roles. Supply next when nextAt is present. Do not write calculated due notices, day counts, urgency or totals.",
    'For a request to show application cards, write surface "card" and density null. Only set density to "compact" when the user separately asks for tighter spacing; never write "comfortable" as a default.',
  ],
} as const satisfies c.Meta;

const application = z
  .strictObject({
    applicationId: c.text(32),
    role: c.text(32),
    employer: c.text(32),
    stage: z.enum(["saved", ...activeStages]),
    outcome: z.enum(outcomes),
    applied: c.isoDate.optional(),
    lastContact: c.isoDate.optional(),
    next: c.text(36).optional(),
    nextAt: c.isoDate.optional(),
    goto: c.screenId,
  })
  .refine(
    ({ stage, applied }) => stage !== "saved" || applied === undefined,
    "Saved roles have no applied date",
  )
  .refine(
    ({ next, nextAt }) => nextAt === undefined || next !== undefined,
    "A follow-up date needs a next action",
  );

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  applications: z
    .array(application)
    .min(1)
    .max(6)
    .refine(
      (rows) => new Set(rows.map((row) => row.applicationId)).size === rows.length,
      "Use distinct application IDs",
    ),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const [row] = seedRows(input, 1);
  return {
    applications: [
      {
        applicationId: "application_1",
        role: row!.title(32),
        employer: row!.detail(32),
        stage: "applied",
        outcome: "active",
        applied: seedDate,
        goto: seedGoto,
      },
    ],
  };
}

export const examples: z.input<typeof props>[] = [
  {
    applications: [
      {
        applicationId: "trot",
        role: "Summer dog walker",
        employer: "Trot",
        stage: "interview",
        outcome: "active",
        applied: "2027-04-06",
        lastContact: "2027-04-12",
        next: "Send a thank-you note",
        nextAt: "2027-04-13",
        goto: "trot_application",
      },
      {
        applicationId: "coast",
        role: "Assistant trainer",
        employer: "Coast Dogs",
        stage: "saved",
        outcome: "active",
        goto: "coast_application",
      },
    ],
  },
  {
    surface: "card",
    density: "compact",
    applications: [
      {
        applicationId: "press",
        role: "Copy editor",
        employer: "Harbour Press",
        stage: "screening",
        outcome: "rejected",
        applied: "2027-05-01",
        lastContact: "2027-05-08",
        goto: "press_application",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Applications");
export const probes: c.Probe[] = [
  choose(
    "Track my applications to several employers, with hiring stage, last contact and a dated follow-up I can log against each role.",
  ),
  choose(
    "Show three employers as short, tappable rows, each with the role title and a status badge. No follow-up dates, contact history or logging.",
    "List",
  ),
  write(
    "Track my active Trot Summer dog walker application, submitted 2027-04-06, in interview, last contact 2027-04-12, with a thank-you note due 2027-04-13. Also show the saved Assistant trainer opening at Coast Dogs, not applied. Link each role to its details.",
  ),
  {
    ...write(
      "Show my active Trot Summer dog walker application in its own card, not a plain row. I applied 2027-04-06, reached interview, and need to send a thank-you note by 2027-04-13. Link to my application.",
    ),
    variant: { axis: "surface", value: "card" },
  },
  read("Mark the thank-you follow-up for Trot done without sending anything.", {
    address: "a1/r1/followup",
    action: "check",
  }),
] satisfies c.Probe[];
