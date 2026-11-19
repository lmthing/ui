type Payment = { due: string; amount: number };
type Debt = {
  principal: number;
  rate: number;
  payment: number;
  firstDue: string;
  payments: readonly Payment[];
};
export type PayoffStrategy = "high_rate" | "small_balance";
export type PayoffSource = { debts: readonly Debt[]; extra: number; strategy: PayoffStrategy };
type Account = {
  index: number;
  start: number;
  rate: number;
  payment: number;
  opening: number;
  balance: number;
  clearance: number | undefined;
};

const MONTHS_PER_YEAR = 12;
const FORECAST_MONTHS = 100 * MONTHS_PER_YEAR;
const CENTS = 100;
const monthOf = (date: string) => Number(date.slice(0, 4)) * MONTHS_PER_YEAR + Number(date.slice(5, 7)) - 1;
const finite = (value: number) => Math.min(Number.MAX_VALUE, value);
const cents = (value: number) =>
  value >= 1 / CENTS && value < Number.MAX_SAFE_INTEGER / CENTS
    ? Math.round(value * CENTS) / CENTS
    : finite(value);
const sum = (values: number[]) => cents(values.reduce((total, value) => finite(total + value), 0));
const interest = (balance: number, rate: number) => cents(balance + cents(balance * rate));

function replayDebt(debt: Debt, index: number, asOf: number): Account {
  const start = monthOf(debt.firstDue);
  const rate = debt.rate / (MONTHS_PER_YEAR * CENTS);
  let next = start;
  let balance = debt.principal;
  let clearance: number | undefined;
  const accrue = (through: number) => {
    if (rate && balance) {
      for (; next <= through; next++) {
        const updated = interest(balance, rate);
        if (updated === balance) break;
        balance = updated;
      }
    }
    next = Math.max(next, through + 1);
  };
  for (const { due, amount } of [...debt.payments].sort((a, b) => a.due.localeCompare(b.due))) {
    const month = monthOf(due);
    accrue(month);
    if (!balance) break;
    balance = cents(Math.max(0, balance - amount));
    if (!balance) clearance = month;
  }
  accrue(asOf);
  return { index, start, rate, payment: debt.payment, opening: balance, balance, clearance };
}

function orderAccounts(accounts: Account[], strategy: PayoffStrategy) {
  return accounts.sort(
    (a, b) =>
      Number(!a.balance) - Number(!b.balance) ||
      (strategy === "high_rate" ? b.rate - a.rate : a.balance - b.balance) ||
      a.index - b.index,
  );
}

function payMonth(accounts: Account[], month: number, extra: number): boolean {
  const active = accounts.filter((account) => account.start <= month);
  let surplus = extra;
  const before = active.map(({ balance }) => balance);
  for (const account of active) {
    const due = interest(account.balance, account.rate);
    surplus = sum([surplus, Math.max(0, account.payment - due)]);
    account.balance = cents(Math.max(0, due - account.payment));
  }
  for (const account of active) {
    if (surplus > 0 && account.balance) {
      const pay = Math.min(surplus, account.balance);
      account.balance = cents(account.balance - pay);
      surplus = cents(surplus - pay);
    }
    if (!account.balance) account.clearance ??= month;
  }
  return active.some((account, index) => account.balance < before[index]!);
}

/** Replays recorded payments, then forecasts without using the device clock. */
export function projectPayoff({ debts, strategy, extra }: PayoffSource) {
  const first = Math.min(...debts.map((debt) => monthOf(debt.firstDue)));
  const asOf = Math.max(first - 1, ...debts.flatMap((debt) => debt.payments.map(({ due }) => monthOf(due))));
  const accounts = orderAccounts(
    debts.map((debt, index) => replayDebt(debt, index, asOf)),
    strategy,
  );
  const budget = sum([extra, ...accounts.map(({ payment }) => payment)]);
  const total = sum(accounts.map(({ balance }) => balance));
  const points = [total];
  const lastStart = Math.max(...accounts.map(({ start }) => start));
  for (let month = asOf + 1; points.at(-1)! > 0 && month <= asOf + FORECAST_MONTHS; month++) {
    const reduced = payMonth(accounts, month, extra);
    points.push(sum(accounts.map(({ balance }) => balance)));
    if (!reduced && month >= lastStart) break;
  }
  const cleared = total === 0;
  const finish = points.at(-1) === 0 ? Math.max(...accounts.map(({ clearance }) => clearance!)) : undefined;
  return { budget, total, accounts, points, cleared, finish, asOf };
}
