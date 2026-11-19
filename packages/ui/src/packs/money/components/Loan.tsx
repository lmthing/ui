import { z } from "zod";
import {
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Amount/large cannot compute monthly interest, instalments or a debt's projected finish.
export const meta = {
  id: "Loan",
  status: "draft",
  group: "data",
  purpose: "Understand one debt's terms, remaining principal and projected repayment schedule.",
  pick: "One debt's terms and calculated principal, interest and monthly instalment forecast, including interest-free borrowing. Not one amount owed (Amount), recorded repayment progress (Progress), a recent balance trend (Sparkline), reminders (Bills), belongings (Loans), or debt priority (Payoff).",
  writeHints: [
    "Write opening principal > 0, nominal annual rate 0–100, monthly payment > 0, firstDue YYYY-MM-DD, and at most six recorded payments with due and positive amount. No currency, balance, interest totals, schedule or finish date.",
    "style is summary or schedule. Fixed-rate monthly estimates are computed locally, not lender statements or transfers.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Opening terms and payment records saved on the device; code estimates monthly interest and repayments, never transfers money.",
  parts: ["root", "name", "principal", "rate", "payment", "balance", "next", "finish", "schedule", "edit"],
  states: ["filled", "loading", "success", "error"],
  actions: { parts: { edit: ["press"] }, when: { edit: { linked: true } } },
} as const satisfies Meta;

export const loanSource = z.strictObject({
  name: text(24),
  principal: z.number().positive(),
  rate: z.number().min(0).max(100),
  payment: z.number().positive(),
  firstDue: isoDate,
  payments: z
    .array(z.strictObject({ due: isoDate, amount: z.number().positive() }))
    .min(0)
    .max(6),
});

export const props = loanSource
  .extend({
    goto: screenId.optional(),
    style: z.enum(["summary", "schedule"]).default("summary"),
  })
  .overwrite((value) => ({ ...value, linked: value.goto !== undefined }));

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  return {
    name: (item && titleOf(item, 24, thing)) || placeholderTitle(0),
    principal: 1,
    rate: 0,
    payment: 1,
    firstDue: "2026-12-01",
    payments: [],
  };
}

export const examples = [
  {
    name: "Ledge supplies card",
    principal: 1200,
    rate: 18.9,
    payment: 100,
    firstDue: "2026-11-01",
    payments: [{ due: "2026-11-01", amount: 100 }],
    goto: "terms",
    style: "summary",
  },
  {
    name: "Trot car loan",
    principal: 6000,
    rate: 6,
    payment: 250,
    firstDue: "2026-12-01",
    payments: [],
    style: "schedule",
  },
  {
    name: "Home mortgage",
    principal: 180000,
    rate: 4.5,
    payment: 1100,
    firstDue: "2026-12-01",
    payments: [],
    style: "summary",
  },
  {
    name: "Ana's friend loan",
    principal: 480,
    rate: 0,
    payment: 40,
    firstDue: "2026-11-01",
    payments: [{ due: "2026-11-01", amount: 40 }],
    goto: "friend_terms",
    style: "schedule",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Loan");
export const probes = [
  choose(
    "Given my car debt's opening principal, annual interest rate and monthly payment, calculate the next principal and interest split and projected instalment schedule",
  ),
  choose(
    "Show one big figure for the amount I owe my friend; no interest terms or repayment forecast",
    "Amount",
  ),
  choose(
    "Show recorded payments against several fixed repayment targets as separate progress bars, no interest or future schedule",
    "Progress",
  ),
  choose("Show my latest outstanding balance and a short recent trend, no forecast or terms", "Sparkline"),
  choose("Remind me about upcoming electricity and rent payments with paid ticks, no debt interest", "Bills"),
  choose("Prioritise several debts and allocate extra monthly money until all are cleared", "Payoff"),
  write(
    "Car loan opening principal 6000, annual rate 6 percent, monthly payment 250, first due 2026-12-01, no recorded payments. Show schedule, edit opens terms. Write no computed balance or forecast",
  ),
  read("Edit the Ledge supplies card terms", { address: "l1/edit", action: "press" }),
] satisfies Probe[];
