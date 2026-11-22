import { defaultCurrency, type Currency } from "../../../catalog";

const forecastYears = 50;
const percentBase = 100;
export const loanCadences = ["weekly", "biweekly", "monthly"] as const;
type Cadence = (typeof loanCadences)[number];
const periodsPerYear = { weekly: 52, biweekly: 26, monthly: 12 };
const daysPerPeriod = { weekly: 7, biweekly: 14 };
const dayMs = 86_400_000;

export type LoanTerms = {
  principal: number;
  rate: number;
  payment: number;
  firstDue: string;
  cadence?: Cadence | undefined;
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
function dueAt(first: Date, offset: number, cadence: Cadence): string | undefined {
  const date = new Date(first);
  if (cadence === "monthly") {
    date.setUTCMonth(first.getUTCMonth() + offset + 1, 0);
    date.setUTCDate(Math.min(date.getUTCDate(), first.getUTCDate()));
  } else date.setUTCDate(first.getUTCDate() + offset * daysPerPeriod[cadence]);
  if (date.getUTCFullYear() > 9999) return undefined;
  return date.toISOString().slice(0, 10);
}

function minorScale(currency: Currency): number {
  const digits = new Intl.NumberFormat(undefined, { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits;
  return 10 ** (digits ?? 2);
}

export function isLoanDue(firstDue: string, recordedDue: string, cadence: Cadence): boolean {
  const first = new Date(`${firstDue}T00:00:00Z`);
  const due = new Date(`${recordedDue}T00:00:00Z`);
  const offset =
    cadence === "monthly"
      ? (due.getUTCFullYear() - first.getUTCFullYear()) * periodsPerYear.monthly +
        due.getUTCMonth() -
        first.getUTCMonth()
      : (due.valueOf() - first.valueOf()) / (dayMs * daysPerPeriod[cadence]);
  return Number.isInteger(offset) && offset >= 0 && dueAt(first, offset, cadence) === recordedDue;
}

function forecast(
  balance: number,
  payment: number,
  periodRate: number,
  scale: number,
  dueFor: (offset: number) => string | undefined,
  start: number,
  limit: number,
): Projection {
  const rows: RepaymentRow[] = [];
  const remaining = balance / scale;
  if (balance === 0) return { balance: 0, status: "cleared", rows };
  if (!Number.isFinite(balance)) return { status: "outOfRange", rows };
  if (payment <= Math.round(balance * periodRate))
    return { balance: remaining, status: "insufficient", rows };
  for (let index = 0; index < limit; index++) {
    const due = dueFor(start + index);
    if (!due) break;
    const interest = Math.round(balance * periodRate);
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
  const cadence = terms.cadence ?? "monthly";
  const periods = periodsPerYear[cadence];
  const periodRate = terms.rate / (percentBase * periods);
  const first = new Date(`${terms.firstDue}T00:00:00Z`);
  const dueFor = (offset: number) => dueAt(first, offset, cadence);
  const recorded = new Map<string, number>();
  for (const { due, amount } of terms.payments) {
    if (due <= today) recorded.set(due, (recorded.get(due) ?? 0) + minor(amount));
  }
  let balance = minor(terms.principal);
  let offset = 0;
  for (; balance > 0 && Number.isFinite(balance); offset++) {
    const due = dueFor(offset);
    if (!due || due > today || (due === today && !recorded.has(due))) break;
    const interest = Math.round(balance * periodRate);
    const paid = recorded.get(due) ?? 0;
    // Subtract before adding when possible to avoid overflow on an overpayment.
    balance = Math.max(0, balance - (paid - interest));
  }
  return forecast(balance, minor(terms.payment), periodRate, scale, dueFor, offset, forecastYears * periods);
}
