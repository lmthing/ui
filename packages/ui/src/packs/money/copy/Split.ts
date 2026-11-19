import { defaultCurrency, localeOf, moneyLine } from "../../../catalog";
import { moneyWordsFor } from "../lang";

type Expense = { amount: number; by: number };
type Ledger = {
  people: readonly { name: string; id?: string }[];
  expenses: readonly (Expense & { title: string })[];
};
type Payment = { from: number; to: number; cents: bigint };

/** Round the source decimal once, without binary half-cent errors or unsafe integer sums. */
function centsOf(amount: number): bigint {
  const [decimal, exponent] = String(amount).split("e");
  const [whole, fraction = ""] = decimal!.split(".");
  const digits = BigInt(whole! + fraction);
  const places = 2 + Number(exponent ?? 0) - fraction.length;
  if (places >= 0) return digits * 10n ** BigInt(places);
  const scale = 10n ** BigInt(-places);
  return (digits + scale / 2n) / scale;
}

/** Both modes have one share per person until the source schema supplies weights. */
export function splitBalances(count: number, expenses: readonly Expense[]): bigint[] {
  const balances = Array<bigint>(count).fill(0n);
  const people = BigInt(count);
  for (const { amount, by } of expenses) {
    const cents = centsOf(amount);
    const share = cents / people;
    const remainder = Number(cents % people);
    balances[by] = balances[by]! + cents;
    for (let index = 0; index < count; index++)
      balances[index] = balances[index]! - share - (index < remainder ? 1n : 0n);
  }
  return balances;
}

/** A minimum plan is a forest: remove one leaf at a time. With at most six people, try every
 * possible leaf transfer between a debtor and creditor, keeping the shortest plan. */
export function splitPayments(balances: readonly bigint[]): Payment[] {
  let best: Payment[] | undefined;
  for (const [from, debt] of balances.entries()) {
    if (debt >= 0n) continue;
    for (const [to, credit] of balances.entries()) {
      if (credit <= 0n) continue;
      const cents = credit < -debt ? credit : -debt;
      const remaining = [...balances];
      remaining[from] = debt + cents;
      remaining[to] = credit - cents;
      const plan = [{ from, to, cents }, ...splitPayments(remaining)];
      if (!best || plan.length < best.length) best = plan;
    }
  }
  return best ?? [];
}

function splitMoney(cents: bigint, lang?: string) {
  if (cents > -100_000_000n && cents < 100_000_000n)
    return moneyLine(Number(cents) / 100, undefined, undefined, lang);
  return new Intl.NumberFormat(localeOf(lang), {
    style: "currency",
    currency: defaultCurrency,
    notation: "scientific",
    maximumSignificantDigits: 3,
  }).format(cents / 100n);
}

export function splitCopy({ people, expenses }: Ledger, lang?: string) {
  const words = moneyWordsFor(lang).split;
  const balances = splitBalances(people.length, expenses);
  const payments = splitPayments(balances);
  return {
    balances: balances.map((cents) => ({
      cents,
      value: words.balance(splitMoney(cents, lang), cents),
      status: cents > 0n ? words.getsBack : cents < 0n ? words.owes : words.even,
    })),
    settlements: people.flatMap(({ name }, from) => {
      const paymentsForPerson = payments.filter((payment) => payment.from === from);
      return paymentsForPerson.length
        ? [
            {
              from,
              label: words.recordFor(name),
              action:
                paymentsForPerson.length === 1
                  ? words.record
                  : paymentsForPerson.length === 2
                    ? words.recordBoth
                    : words.recordAll,
              payments: paymentsForPerson.map(({ to, cents }) => ({
                to,
                route: words.pays(name, people[to]!.name),
                amount: splitMoney(cents, lang),
              })),
            },
          ]
        : [];
    }),
    expenses: expenses.map(({ title, by, amount }) => ({
      title,
      paidBy: words.paidBy(people[by]!.name),
      amount: splitMoney(centsOf(amount), lang),
    })),
  };
}

export function splitReading(input: Ledger, lang?: string) {
  const words = moneyWordsFor(lang).split;
  const { balances, settlements, expenses } = splitCopy(input, lang);
  return [
    ...(settlements.length
      ? [
          words.settleUp,
          ...settlements.flatMap(({ from, label, action, payments }) => [
            input.people[from]!.id ? `${input.people[from]!.id}: ${label}` : label,
            ...payments.map(({ route, amount }) => words.paymentLine(route, amount)),
            action,
          ]),
        ]
      : [expenses.length ? words.settled : words.empty]),
    words.balances,
    ...balances.flatMap(({ status, value }, index) => [
      words.balanceLine(input.people[index]!.name, value),
      status,
    ]),
    ...(expenses.length
      ? [
          words.expenses,
          ...expenses.map(({ title, paidBy, amount }) => words.expenseLine(title, paidBy, amount)),
        ]
      : []),
    words.add,
  ];
}
