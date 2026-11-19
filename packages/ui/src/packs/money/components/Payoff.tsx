import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";
import { loanSource } from "./Loan";

// Core first: Progress/stack cannot allocate a monthly budget and forecast priority across debts.
export const meta = {
  id: "Payoff",
  status: "draft",
  group: "data",
  purpose: "Plan a monthly budget and repayment priority to clear your debts.",
  pick: "Allocate regular payments plus extra across debts and forecast clearance by high rate or small balance. Not one debt's instalment breakdown (Loan), static repayment progress (Progress), a recent balance trend (Sparkline), or group settle-ups (Split).",
  writeHints: [
    "Each debt uses opening name, principal > 0, annual rate 0–100, payment > 0, firstDue YYYY-MM-DD and 0–6 positive payment records with due and amount. Never write currency, balances, budget, allocation, order, dates or chart points.",
    "extra is a nonnegative additional monthly amount. strategy is high_rate or small_balance and changes the calculation; style is plan or compact. Fixed-rate estimates never transfer money.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "A local monthly repayment projection from stored terms and payment records, never a payment or lender statement.",
  parts: ["root", "total", "budget", "finish", "line", "strategy", "extra", "edit", "empty"],
  items: { key: "debts", parts: ["root", "name", "balance", "clearance", "order"] },
  states: ["filled", "empty", "loading", "success", "error"],
  select: { prop: "strategy", value: { field: "strategy" } },
  actions: {
    parts: { strategy: ["select"], extra: ["set"], edit: ["press"] },
    when: { edit: { linked: true } },
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    debts: z.array(loanSource).min(1).max(6),
    extra: z.number().nonnegative().default(0),
    strategy: z.enum(["high_rate", "small_balance"]).default("high_rate"),
    goto: screenId.optional(),
    style: z.enum(["plan", "compact"]).default("plan"),
  })
  .overwrite((value) => ({ ...value, linked: value.goto !== undefined }));

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const debts = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 24, thing) || placeholderTitle(index),
    principal: 1,
    rate: 0,
    payment: 1,
    firstDue: "2026-12-01",
    payments: [],
  }));
  return {
    debts: debts.length
      ? debts
      : [
          {
            name: placeholderTitle(0),
            principal: 1,
            rate: 0,
            payment: 1,
            firstDue: "2026-12-01",
            payments: [],
          },
        ],
  };
}

export const examples = [
  {
    debts: [
      {
        name: "Ledge supplies card",
        principal: 1200,
        rate: 18.9,
        payment: 100,
        firstDue: "2026-11-01",
        payments: [{ due: "2026-11-01", amount: 100 }],
      },
      {
        name: "Home mortgage",
        principal: 180000,
        rate: 4.5,
        payment: 1100,
        firstDue: "2026-12-01",
        payments: [],
      },
    ],
    extra: 50,
    strategy: "high_rate",
    goto: "debts",
    style: "plan",
  },
  {
    debts: [
      { name: "Trot car loan", principal: 6000, rate: 6, payment: 250, firstDue: "2026-12-01", payments: [] },
      {
        name: "Ana's friend loan",
        principal: 480,
        rate: 0,
        payment: 40,
        firstDue: "2026-11-01",
        payments: [{ due: "2026-11-01", amount: 40 }],
      },
    ],
    extra: 30,
    strategy: "small_balance",
    style: "compact",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Payoff");
export const probes = [
  choose(
    "Use my debts' terms, regular monthly payments and an extra monthly amount to prioritise high-interest debts, forecast each clearance month and when I am debt free",
  ),
  choose(
    "Show recorded payments against several fixed repayment goals as separate progress bars, no allocation or future interest calculation",
    "Progress",
  ),
  choose(
    "Calculate the next principal and interest instalment for one loan from its terms, not a debt-priority plan",
    "Loan",
  ),
  choose(
    "Show the recent trend of my outstanding balance beside its latest value, not a future repayment forecast",
    "Sparkline",
  ),
  choose("Calculate who in our shared flat should pay whom after grocery expenses", "Split"),
  write(
    "Plan repayment of Card: principal 1200, rate 18.9, payment 100; Friend: principal 480, rate zero, payment 40. Both first due 2026-12-01 with no recorded payments. Extra monthly 50, high rate priority, plan style, edit opens debts. No computed totals",
  ),
  read("Change the debt repayment priority", { address: "p1/strategy", action: "select" }),
] satisfies Probe[];
