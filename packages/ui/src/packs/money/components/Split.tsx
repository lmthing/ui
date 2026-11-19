import { z } from "zod";
import {
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Amount/large cannot derive each person's balance and group settle-ups from shared expenses.
export const meta = {
  id: "Split",
  status: "draft",
  group: "data",
  purpose: "Work out who owes whom after sharing expenses.",
  pick: "Shared costs, each person's balance and the payments to settle the group. Not one sum owed (Amount), personal bills (Bills), client payments (PaymentStatus), or fixed debt repayment (Loan, Payoff).",
  writeHints: [
    "by is a zero-based index into people. Write only source expenses, never balances, shares, totals or settle-up payments. split is equal or shares.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Shared expense records and acknowledgement of settlements in a shared app.",
  partTiers: { settle: "people" },
  parts: ["root", "add", "empty"],
  items: { key: "people", parts: ["root", "name", "photo", "balance", "settle"] },
  states: ["filled", "empty", "success"],
  actions: { parts: { add: ["press"] }, items: { settle: ["press"] } },
} as const satisfies Meta;

export const props = z
  .strictObject({
    people: z
      .array(z.strictObject({ name: text(20), photo }))
      .min(2)
      .max(6),
    expenses: z
      .array(
        z.strictObject({
          title: text(28),
          amount: z.number().nonnegative(),
          by: z.number().int().min(0).max(5),
          split: z.enum(["equal", "shares"]),
        }),
      )
      .min(0)
      .max(6),
    goto: screenId,
  })
  .refine(({ people, expenses }) => expenses.every((expense) => expense.by < people.length), {
    path: ["expenses"],
    message: "Every payer must index an existing person",
  });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const people = itemsOf(cast, 6).map((item, index) => ({
    name: titleOf(item, 20, thing) || placeholderTitle(index, lang),
    photo: "lib:people",
  }));
  while (people.length < 2) people.push({ name: placeholderTitle(people.length, lang), photo: "lib:people" });
  return { people, expenses: [], goto: "entry" };
}

export const examples = [
  {
    people: [
      { name: "Ana", photo: "lib:people" },
      { name: "Sam", photo: "local:1" },
    ],
    expenses: [{ title: "Ledge shared plant supplies", amount: 48, by: 0, split: "equal" }],
    goto: "entry",
  },
  {
    people: [
      { name: "Ben", photo: "lib:people" },
      { name: "Maya", photo: "lib:people" },
    ],
    expenses: [{ title: "Trot walking-trip fuel", amount: 30, by: 1, split: "shares" }],
    goto: "expense",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Split");
export const probes = [
  choose(
    "Our flatmates log who paid each shared expense; calculate each person's balance and who should pay whom to settle up",
  ),
  choose("Show just the single amount I owe my friend, no expense group or settle-up plan", "Amount"),
  write(
    "Ana and Sam have lib:people photos. Ana paid 48 for shared plant supplies, split equally; Sam paid 12 for pots, split equally. Add expenses opens entry. Write source expenses only",
  ),
  read("Add a shared expense", { address: "s1/add", action: "press" }),
] satisfies Probe[];
