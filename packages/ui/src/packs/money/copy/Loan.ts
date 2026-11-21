import {
  compactMoneyLine,
  dateLocaleOf,
  defaultCurrency,
  localeOf,
  moneyLine,
  numberLine,
  pluralForm,
  type Currency,
} from "../../../catalog";
import { moneyWordsFor } from "../lang";
import { loanToday, projectLoan, type LoanTerms } from "./repayment";

type LoanInput = LoanTerms & {
  detail: "brief" | "full";
  goto?: string | undefined;
  style?: "installments" | undefined;
};
const rowLimit = 6;
const compactAt = 1_000_000;

function scheduleMoneyFormatter(currency = defaultCurrency, lang?: string) {
  const formatter = new Intl.NumberFormat(localeOf(lang), { style: "currency", currency });
  return (amount: number) =>
    amount >= compactAt ? compactMoneyLine(amount, currency, lang) : formatter.format(amount);
}

function loanDateFormatter(lang?: string) {
  const dateFormat = new Intl.DateTimeFormat(dateLocaleOf(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return (due: string) => dateFormat.format(new Date(`${due}T00:00:00Z`));
}

function loanStatus(
  state: string,
  status: ReturnType<typeof projectLoan>["status"],
  labels: ReturnType<typeof moneyWordsFor>["loanLabels"],
  periodic: boolean,
): { headline?: string; notice?: string } {
  if (state === "success" || status === "cleared") return { headline: labels.cleared };
  if (status === "insufficient")
    return {
      headline: labels.insufficientTitle,
      notice: periodic ? labels.insufficientPeriodic : labels.insufficient,
    };
  if (status === "outOfRange") return { headline: labels.forecastError, notice: labels.outOfRange };
  return state === "error" ? { headline: labels.forecastError, notice: labels.forecastHelp } : {};
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
  const scheduleMoney = scheduleMoneyFormatter(currency, lang);
  const rate = new Intl.NumberFormat(localeOf(lang), {
    style: "percent",
    maximumFractionDigits: 3,
  }).format(input.rate / 100);
  const cadence = input.cadence ?? "monthly";
  const installments = input.style === "installments";
  const showSchedule = input.detail === "full" || installments;
  const terms = [
    { part: "principal", text: words.loanField(labels.principal, money(input.principal)) },
    { part: "rate", text: words.loanField(labels.rate, rate) },
    {
      part: "payment",
      text: words.loanField(cadence === "monthly" ? labels.payment : labels[cadence], money(input.payment)),
    },
  ];
  const next = rows[0];
  const more = rows.length - rowLimit;
  const { headline, notice } = loanStatus(state, status, labels, cadence !== "monthly");
  return {
    terms,
    headline,
    notice,
    installments,
    balance: balance === undefined || headline ? undefined : money(balance),
    next:
      next && !installments
        ? {
            headline: words.loanNext(labels.next, date(next.due), money(next.principal + next.interest)),
            split: words.loanSplit(money(next.principal), money(next.interest)),
          }
        : undefined,
    finish: finish ? words.loanField(labels.finish, date(finish)) : labels.unavailable,
    scheduleLabel: installments ? labels.installments : labels.schedule,
    schedule: showSchedule
      ? rows.slice(0, rowLimit).map((row) => ({
          due: row.due,
          date: date(row.due),
          remaining: words.loanRemaining(scheduleMoney(row.balance)),
          payment: installments
            ? words.loanField(labels.installmentAmount, scheduleMoney(row.principal + row.interest))
            : undefined,
          split:
            installments && input.rate === 0
              ? undefined
              : words.loanSplit(money(row.principal), money(row.interest)),
        }))
      : [],
    more:
      showSchedule && more > 0 ? words.loanMore(numberLine(more, lang), pluralForm(more, lang)) : undefined,
  };
}

export function loanReading(input: LoanInput, state: string, lang?: string): string[] {
  if (state === "loading") return [];
  const { loanLabels } = moneyWordsFor(lang);
  const { balance, terms, headline, notice, next, finish, installments, schedule, scheduleLabel, more } =
    loanCopy(input, state, lang);
  return [
    ...(headline ? [headline, ...(notice ? [notice] : [])] : []),
    ...(balance === undefined ? [] : [loanLabels.balance, balance]),
    ...terms.map(({ text }) => text),
    ...(headline
      ? []
      : [
          ...(next ? [next.headline, next.split] : []),
          ...(!installments ? [finish] : []),
          ...(schedule.length
            ? [
                scheduleLabel,
                ...schedule.flatMap(({ date, payment, remaining, split }) => [
                  date,
                  remaining,
                  ...(payment ? [payment] : []),
                  ...(split ? [split] : []),
                ]),
              ]
            : []),
          ...(more ? [more] : []),
          ...(installments ? [finish] : []),
          loanLabels.estimate,
        ]),
    ...(input.goto && state === "filled" ? [loanLabels.edit] : []),
  ];
}
