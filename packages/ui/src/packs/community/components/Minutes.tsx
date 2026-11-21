import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, ref, seedDate, seedTitle } from "../seeds";

// Core first: Checklist/default tracks jobs, not approved decisions linked to motions and owned follow-up.
export const meta = {
  id: "Minutes",
  status: "draft",
  group: "content",
  purpose: "Record agreed decisions and follow-up actions with owners and sign-off.",
  pick: "Official meeting minutes with agreed decisions, linked motions, owned follow-up and approval. Not a draft note (Composer), personal jobs (Checklist), long prose (Article) or a change audit (ActivityLog).",
  writeHints: [
    "Use unique snake_case decision and action ids. Each action decisionId must match a decision in this record. Only link closed, uncancelled votes; do not write their outcomes again.",
    'Set both approval fields together or neither; approvedAt is an offset ISO datetime. Use style "actions" only for follow-up with decision links, not the official record.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath:
    "A shared record links stored motions and members; chair approval locks decisions, but actions can still progress.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "title", "date", "chair", "approval", "approve"],
  items: {
    key: "entries",
    parts: ["root", "title", "text", "motion", "decision", "owner", "due", "done"],
    visibleWhen: { visible: true },
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { approve: ["press"] },
    items: { root: ["press"], done: ["check"] },
    when: {
      approve: { approved: false, can_approve: true },
      root: { kind: "decision", linked: true },
      done: { kind: "action", can_check: true },
    },
  },
  signature: "check_burst",
  read: (input): string[] => minutesReading(input as z.output<typeof schema>),
} as const satisfies c.Meta;

const decision = z.strictObject({
  id: ref,
  title: c.text(32),
  text: c.text(200),
  voteId: ref.optional(),
});
const followUp = z.strictObject({
  id: ref,
  decisionId: ref,
  text: c.text(36),
  ownerId: ref,
  due: c.isoDate.optional(),
  done: z.boolean(),
});

const schema = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(40),
  date: c.isoDate,
  chairId: ref,
  decisions: z.array(decision).min(1).max(8),
  actions: z.array(followUp).min(0).max(12),
  approvedAt: dateTime.optional(),
  approvedBy: ref.optional(),
  style: z.enum(["record", "actions"]).default("record"),
});

export const props = schema
  .refine(({ approvedAt, approvedBy }) => Boolean(approvedAt) === Boolean(approvedBy), {
    path: ["approvedBy"],
  })
  .refine(({ decisions }) => distinct(decisions, (row) => row.id), { path: ["decisions"] })
  .refine(
    ({ decisions, actions }) =>
      distinct(actions, (row) => row.id) &&
      actions.every((row) => decisions.some(({ id }) => row.decisionId === id)),
    { path: ["actions"] },
  )
  .overwrite((input) => ({
    ...input,
    approved: Boolean(input.approvedAt),
    entries: [
      ...input.decisions.map((row) => ({
        ...row,
        entryId: row.id,
        kind: "decision",
        linked: Boolean(row.voteId),
        visible: input.style === "record",
      })),
      ...input.actions.map((row) => ({ ...row, entryId: row.id, kind: "action", visible: true })),
    ],
  }));

function minutesReading({ style, decisions, actions }: z.output<typeof schema>): string[] {
  return [
    ...(style === "record" ? decisions.map((row, i) => `r${i + 1}: ${JSON.stringify(row.title)}`) : []),
    ...actions.map((row, i) => `r${decisions.length + i + 1}: ${JSON.stringify(row.text)}`),
  ];
}

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    title: seedTitle(input, 40),
    date: seedDate,
    chairId: "item_1",
    decisions: [
      { id: "decision_1", title: seedTitle(input, 32), text: c.wordsFor(input.lang).placeholderDetail },
    ],
    actions: [],
  };
}

export const examples: z.input<typeof props>[] = [
  {
    title: "November committee minutes",
    date: "2026-11-18",
    chairId: "ana",
    decisions: [
      {
        id: "shed_purchase",
        title: "Buy a shared tool shed",
        text: "Obtain quotes before ordering the agreed shed.",
        voteId: "shed",
      },
    ],
    actions: [
      {
        id: "quotes",
        decisionId: "shed_purchase",
        text: "Obtain three quotes",
        ownerId: "ana",
        due: "2026-11-28",
        done: true,
      },
      {
        id: "delivery",
        decisionId: "shed_purchase",
        text: "Arrange shed delivery",
        ownerId: "lee",
        done: false,
      },
    ],
    approvedAt: "2026-11-19T10:00:00Z",
    approvedBy: "ana",
  },
  {
    title: "Choir committee minutes",
    date: "2026-10-08",
    chairId: "jo",
    style: "actions",
    density: "compact",
    surface: "outlined",
    decisions: [{ id: "hall_renewal", title: "Renew the hall lease", text: "Renew for the spring term." }],
    actions: [
      {
        id: "confirm_dates",
        decisionId: "hall_renewal",
        text: "Confirm rehearsal dates",
        ownerId: "lee",
        done: false,
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Minutes");
export const probes = [
  choose(
    "Keep our official agreed meeting decisions with links to motions, follow-up owners and due dates, and a chair's sign-off.",
  ),
  choose(
    "Make a short checklist of private jobs I can tick off. No meeting decisions, owners or approvals.",
    "Checklist",
  ),
  write(
    "Record our November committee minutes for 18 November 2026. Ana chaired. We decided to buy a shared tool shed after the motion called shed, and agreed to obtain quotes before ordering. Ana owns the follow-up, Obtain three quotes, and hasn't finished it yet.",
  ),
  read("Open the motion linked to the decision to buy the shared tool shed.", {
    address: "m1/r1",
    action: "press",
  }),
] satisfies c.Probe[];
