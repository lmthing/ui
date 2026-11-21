import { appointmentDate, moneyLine, type AppCurrency } from "../../../catalog";
import { customersWordsFor } from "../lang";

type FollowUp = {
  kind: "quote" | "invoice" | "checkin" | "renewal";
  due: string;
  done: boolean;
  note?: string | undefined;
  amount?: number | undefined;
};

export function followUpToday(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${String(now.getFullYear()).padStart(4, "0")}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function followUpPriority(row: FollowUp, today: string) {
  return row.done ? "done" : row.due < today ? "overdue" : row.due === today ? "today" : "upcoming";
}

export function orderFollowUps<T extends FollowUp>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
}

export function followUpDetails(row: FollowUp, today: string, lang?: string, currency?: AppCurrency) {
  const { followUpLabels: copy } = customersWordsFor(lang);
  const priority = followUpPriority(row, today);
  const date = appointmentDate(row.due, lang);
  return {
    priority,
    badge: copy[priority],
    kind: copy[row.kind],
    reason: copy.reason(copy[row.kind], row.note),
    date,
    due: copy.due(copy[priority], date),
    amount: row.amount === undefined ? undefined : moneyLine(row.amount, currency, undefined, lang),
  };
}
