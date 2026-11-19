import {
  compactMoneyLine,
  dateLocaleOf,
  localeOf,
  moneyLine,
  numberLine,
  pluralForm,
  type Currency,
} from "../../../catalog";
import { moneyWordsFor } from "../lang";
import { loanToday, projectLoan, type LoanTerms } from "./repayment";

type LoanInput = LoanTerms & { style: "summary" | "schedule"; goto?: string | undefined };
const rowLimit = 6;
const compactAt = 1_000_000;

function loanDateFormatter(lang?: string) {
  const dateFormat = new Intl.DateTimeFormat(dateLocaleOf(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return (due: string) => dateFormat.format(new Date(`${due}T00:00:00Z`));
}

export function loanCopy(
  input: LoanInput,
  state: string,
  lang?: string,
  today = loanToday(),
  currency?: Currency,
) {
  const words = moneyWordsFor(lang);
  const labels = words.loanLabels;
  const { balance, rows, finish, status } = projectLoan(input, today, currency);
  const money = (amount: number) =>
    amount >= compactAt
      ? compactMoneyLine(amount, currency, lang)
      : moneyLine(amount, currency, undefined, lang);
  const date = loanDateFormatter(lang);
  const rate = new Intl.NumberFormat(localeOf(lang), {
    style: "percent",
    maximumFractionDigits: 3,
  }).format(input.rate / 100);
  const terms = [
    { part: "principal", text: words.loanField(labels.principal, money(input.principal)) },
    { part: "rate", text: words.loanField(labels.rate, rate) },
    { part: "payment", text: words.loanField(labels.payment, money(input.payment)) },
  ];
  const next = rows[0];
  const more = rows.length - rowLimit;
  return {
    terms,
    balance: balance === undefined || state === "success" ? undefined : money(balance),
    notice:
      state === "success" || status === "cleared"
        ? labels.cleared
        : state === "error" || status === "insufficient"
          ? labels.insufficient
          : status === "outOfRange"
            ? labels.outOfRange
            : undefined,
    next: next
      ? {
          headline: words.loanNext(labels.next, date(next.due), money(next.principal + next.interest)),
          split: words.loanSplit(money(next.principal), money(next.interest)),
        }
      : undefined,
    finish: finish ? words.loanField(labels.finish, date(finish)) : labels.unavailable,
    schedule:
      input.style === "schedule"
        ? rows.slice(0, rowLimit).map((row) => ({
            due: row.due,
            headline: words.loanRow(date(row.due), money(row.balance)),
            split: words.loanSplit(money(row.principal), money(row.interest)),
          }))
        : [],
    more:
      input.style === "schedule" && more > 0
        ? words.loanMore(numberLine(more, lang), pluralForm(more, lang))
        : undefined,
  };
}

export function loanReading(input: LoanInput, state: string, lang?: string): string[] {
  if (state === "loading") return [];
  const { loanLabels } = moneyWordsFor(lang);
  const { balance, terms, notice, next, finish, schedule, more } = loanCopy(input, state, lang);
  return [
    ...(balance === undefined ? [] : [loanLabels.balance, balance]),
    ...terms.map(({ text }) => text),
    ...(notice
      ? [notice]
      : [
          ...(next ? [next.headline, next.split] : []),
          finish,
          ...(schedule.length
            ? [loanLabels.schedule, ...schedule.flatMap(({ headline, split }) => [headline, split])]
            : []),
          ...(more ? [more] : []),
          loanLabels.estimate,
        ]),
    ...(input.goto && state === "filled" ? [loanLabels.edit] : []),
  ];
}
