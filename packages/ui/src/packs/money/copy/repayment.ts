import { defaultCurrency, type Currency } from "../../../catalog";

const forecastLimit = 600;
const monthsPerYear = 12;
const percentBase = 100;

export type LoanTerms = {
  principal: number;
  rate: number;
  payment: number;
  firstDue: string;
  payments: readonly { due: string; amount: number }[];
};

export type RepaymentRow = { due: string; principal: number; interest: number; balance: number };
type Projection = {
  balance?: number;
  rows: RepaymentRow[];
  finish?: string;
  status: "active" | "cleared" | "insufficient" | "outOfRange";
};

export function loanToday(now = new Date()): string {
  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Always anchor to the original due day so February does not shift later instalments. */
function dueAt(first: Date, offset: number): string | undefined {
  const date = new Date(first);
  date.setUTCMonth(first.getUTCMonth() + offset + 1, 0);
  if (date.getUTCFullYear() > 9999) return undefined;
  date.setUTCDate(Math.min(date.getUTCDate(), first.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

function minorScale(currency: Currency): number {
  const digits = new Intl.NumberFormat(undefined, { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits;
  return 10 ** (digits ?? 2);
}

function forecast(
  balance: number,
  payment: number,
  monthly: number,
  scale: number,
  first: Date,
  start: number,
): Projection {
  const rows: RepaymentRow[] = [];
  const remaining = balance / scale;
  if (balance === 0) return { balance: 0, status: "cleared", rows };
  if (!Number.isFinite(balance)) return { status: "outOfRange", rows };
  if (payment <= Math.round(balance * monthly)) return { balance: remaining, status: "insufficient", rows };
  for (let index = 0; index < forecastLimit; index++) {
    const due = dueAt(first, start + index);
    if (!due) break;
    const interest = Math.round(balance * monthly);
    const principal = Math.min(balance, payment - interest);
    const next = balance - principal;
    if (next === balance) break;
    rows.push({ due, principal: principal / scale, interest: interest / scale, balance: next / scale });
    if (next === 0) return { balance: remaining, rows, finish: due, status: "active" };
    balance = next;
  }
  return { balance: remaining, rows, status: "active" };
}

/** Apply only recorded money to elapsed instalments; project regular payments separately. */
export function projectLoan(
  terms: LoanTerms,
  today: string,
  currency: Currency = defaultCurrency,
): Projection {
  const scale = minorScale(currency);
  const minor = (amount: number) => Math.round(amount * scale);
  const monthly = terms.rate / (percentBase * monthsPerYear);
  const first = new Date(`${terms.firstDue}T00:00:00Z`);
  const recorded = new Map<string, number>();
  for (const { due, amount } of terms.payments) {
    if (due <= today) recorded.set(due, (recorded.get(due) ?? 0) + minor(amount));
  }
  let balance = minor(terms.principal);
  let offset = 0;
  for (; balance > 0 && Number.isFinite(balance); offset++) {
    const due = dueAt(first, offset);
    if (!due || due > today || (due === today && !recorded.has(due))) break;
    const interest = Math.round(balance * monthly);
    const paid = recorded.get(due) ?? 0;
    // Subtract before adding when possible to avoid overflow on an overpayment.
    balance = Math.max(0, balance - (paid - interest));
  }
  return forecast(balance, minor(terms.payment), monthly, scale, first, offset);
}
