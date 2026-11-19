import { z } from "zod";
import {
  icon,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Checklist/plain cannot show recurring payment amounts, due dates and computed cost totals.
export const meta = {
  id: "Bills",
  status: "draft",
  group: "data",
  purpose: "Keep on top of upcoming bills and recurring subscriptions.",
  pick: "Upcoming or recurring personal payments with amounts, due dates and paid ticks. Not generic tasks (Checklist), client invoicing (Invoice), past spending (Transactions), or debt forecasts (Loan).",
  writeHints: [
    "Write stored paid flags and numeric amounts, never totals, overdue flags or currency. due is optional; repeat is never, weekly, monthly or yearly.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Bills saved on the device; reminders before due dates need notification permission.",
  parts: ["root", "total", "empty"],
  items: { key: "bills", parts: ["root", "name", "amount", "due", "repeat", "paid", "icon"] },
  states: ["filled", "empty"],
  actions: { items: { paid: ["check"], root: ["press"] } },
} as const satisfies Meta;

export const props = z.strictObject({
  bills: z
    .array(
      z.strictObject({
        name: text(24),
        amount: z.number().nonnegative(),
        due: isoDate.optional(),
        repeat: z.enum(["never", "weekly", "monthly", "yearly"]),
        paid: z.boolean(),
        icon,
      }),
    )
    .min(1)
    .max(6),
  style: z.enum(["due", "subscriptions"]).default("due"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const bills = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 24, thing) || placeholderTitle(index, lang),
    amount: 0,
    repeat: "never" as const,
    paid: false,
    icon: "dot" as const,
  }));
  return {
    bills: bills.length
      ? bills
      : [
          {
            name: placeholderTitle(0, lang),
            amount: 0,
            repeat: "never",
            paid: false,
            icon: "dot",
          },
        ],
  };
}

export const examples = [
  {
    style: "due",
    bills: [
      {
        name: "Ledge supplies delivery",
        amount: 24.5,
        due: "2026-11-24",
        repeat: "never",
        paid: false,
        icon: "leaf",
      },
      {
        name: "Grow-light electricity",
        amount: 18,
        due: "2026-11-28",
        repeat: "monthly",
        paid: true,
        icon: "zap",
      },
    ],
  },
  {
    style: "subscriptions",
    bills: [
      { name: "Trot phone plan", amount: 12, repeat: "monthly", paid: false, icon: "phone" },
      {
        name: "Walking insurance",
        amount: 96,
        due: "2026-12-01",
        repeat: "yearly",
        paid: false,
        icon: "shield",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Bills");
export const probes = [
  choose(
    "Track my rent, power bill and monthly subscriptions with amounts, due dates, paid ticks and a computed monthly total",
  ),
  choose(
    "Give me a simple list of household jobs to tick off, with no payment amounts or due payments",
    "Checklist",
  ),
  write(
    "Due bills: Rent 800 due 2026-12-01 monthly unpaid with home icon; Power 60 due 2026-11-28 monthly paid with zap icon. Do not write totals",
  ),
  read("Mark the Ledge supplies delivery bill as paid", { address: "b1/r1/paid", action: "check" }),
] satisfies Probe[];
