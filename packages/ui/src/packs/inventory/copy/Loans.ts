import { appointmentDate } from "../../../catalog";
import { inventoryWordsFor } from "../lang";

type Loan = { since: string; due?: string | undefined; way: "lent" | "borrowed"; person: string };

/** Loan dates are civil days on the device, not UTC deadlines. */
export function loanToday(now = new Date()): string {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
}

export function loanDates(
  { since, due }: Pick<Loan, "since" | "due">,
  detail: "full" | "brief",
  lang?: string,
  today = loanToday(),
) {
  const words = inventoryWordsFor(lang).loans;
  return {
    since: detail === "full" ? words.since(appointmentDate(since, lang)) : undefined,
    due: due && words.due(appointmentDate(due, lang)),
    overdue: due && due < today ? words.overdue : undefined,
  };
}

export function loanReading(
  { loans, detail }: { loans: Loan[]; detail: "full" | "brief" },
  lang?: string,
  today = loanToday(),
): string[] {
  const words = inventoryWordsFor(lang).loans;
  const rows = loans.map((loan, index) => {
    const { since, due, overdue } = loanDates(loan, detail, lang, today);
    return `r${index + 1} ${words.reading([`${words.way[loan.way]}${loan.person}`, since, due, overdue].filter((line): line is string => Boolean(line)))}`;
  });
  return [...rows, words.reading([words.returned, words.remind])];
}
