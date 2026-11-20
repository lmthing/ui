import { z } from "zod";
import * as c from "../../../catalog";
import { distinct, ref, seedDate, seedTitle } from "../seeds";

// Core first: Amount/default shows a figure, not assessments reconciled against multiple receipts.
export const meta = {
  id: "Dues",
  status: "draft",
  group: "data",
  purpose: "Reconcile members' subscription assessments and receipts for one period.",
  pick: "Collect and reconcile one period of membership dues against dated receipts. Not a single figure (Amount), personal bills (Bills), a client invoice (Invoice) or one client's payment status (PaymentStatus).",
  writeHints: [
    "Use unique snake_case ids within assessments and receipts. Every receipt assessmentId must match an assessment id in this ledger. Write amounts as numbers, no currency or computed totals.",
    'Use style "ledger" for the treasurer. Use "member" only for a signed-in member and seed only that member’s assessments and receipts.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "The treasurer keeps a local ledger; messaging sends reminders and only a payment service's confirmed receipt changes the ledger.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "period", "assessed", "collected", "outstanding"],
  items: {
    key: "entries",
    parts: [
      "root",
      "member",
      "amount",
      "due",
      "paid",
      "outstanding",
      "credit",
      "status",
      "date",
      "method",
      "voided",
      "record",
      "remind",
      "pay",
      "void",
    ],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { record: ["press"], remind: ["press"], pay: ["press"], void: ["press"] },
    when: {
      record: { kind: "assessment", style: "ledger" },
      remind: { kind: "assessment", style: "ledger", can_remind: true },
      pay: { kind: "assessment", style: "member", can_pay: true },
      void: { kind: "receipt", style: "ledger", voided: false },
    },
  },
  partTiers: { remind: "service", pay: "service" },
  confirmParts: ["void"],
} as const satisfies c.Meta;

const assessment = z.strictObject({
  id: ref,
  memberId: ref,
  amount: z.number().nonnegative(),
  due: c.isoDate,
});
const receipt = z.strictObject({
  id: ref,
  assessmentId: ref,
  amount: z.number().positive(),
  date: c.isoDate,
  method: z.enum(["cash", "transfer", "card"]),
  voided: z.boolean().default(false),
});
const schema = z.strictObject({
  ...c.variantProps(meta.variants),
  period: c.text(20),
  assessments: z.array(assessment).min(1).max(30),
  receipts: z.array(receipt).min(0).max(60),
  style: z.enum(["ledger", "member"]).default("ledger"),
});
export const props = schema
  .refine(({ assessments }) => distinct(assessments, (row) => row.id), { path: ["assessments"] })
  .refine(
    ({ assessments, style }) =>
      style !== "member" || assessments.every((row) => row.memberId === assessments[0]?.memberId),
    { path: ["assessments"] },
  )
  .refine(
    ({ assessments, receipts }) =>
      distinct(receipts, (row) => row.id) &&
      receipts.every((row) => assessments.some(({ id }) => id === row.assessmentId)),
    { path: ["receipts"] },
  )
  .overwrite((input) => ({
    ...input,
    entries: [
      ...input.assessments.map((row) => ({ ...row, entryId: row.id, kind: "assessment" })),
      ...input.receipts.map((row) => ({ ...row, entryId: row.id, kind: "receipt" })),
    ],
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    period: seedTitle(input, 20),
    assessments: [{ id: "assessment_1", memberId: "item_1", amount: 0, due: seedDate }],
    receipts: [],
  };
}

export const examples: z.input<typeof props>[] = [
  {
    period: "2026 subscriptions",
    assessments: [
      { id: "ana_2026", memberId: "ana", amount: 25, due: "2026-04-01" },
      { id: "lee_2026", memberId: "lee", amount: 25, due: "2026-04-01" },
    ],
    receipts: [
      { id: "receipt_1", assessmentId: "ana_2026", amount: 10, date: "2026-03-10", method: "cash" },
      {
        id: "receipt_2",
        assessmentId: "lee_2026",
        amount: 25,
        date: "2026-03-12",
        method: "transfer",
        voided: true,
      },
    ],
  },
  {
    period: "Autumn choir dues",
    density: "compact",
    surface: "outlined",
    style: "member",
    assessments: [{ id: "jo_autumn", memberId: "jo", amount: 30, due: "2026-09-08" }],
    receipts: [
      { id: "receipt_3", assessmentId: "jo_autumn", amount: 30, date: "2026-09-06", method: "card" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Dues");
export const probes = [
  choose(
    "Reconcile our club's annual subscriptions per member, with individual assessments, partial receipts and amounts still owed.",
  ),
  choose("Show one prominent money figure for the 25 membership fee, no members or receipts.", "Amount"),
  write(
    "Show the treasurer's 2026 subscriptions: assessment ana_2026 for member ana, 25 due 2026-04-01, and cash receipt receipt_1 for ana_2026, 10 on 2026-03-10.",
  ),
  read("Void the first, cash receipt, without deleting it.", { address: "d1/r3/void", action: "press" }),
] satisfies c.Probe[];
