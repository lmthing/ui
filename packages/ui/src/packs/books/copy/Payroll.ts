import { z } from "zod";
import {
  appointmentDate,
  currencies,
  defaultCurrency,
  localeOf,
  moneyLine,
  numberLine,
  type DeviceData,
} from "../../../catalog";
import { booksWordsFor } from "../lang";

const configuration = z.object({
  currency: z.enum(currencies),
  rates: z.record(
    z.string(),
    z.object({ deductionRate: z.number().min(0).max(1), employerRate: z.number().nonnegative() }),
  ),
});
type Config = z.output<typeof configuration>;
type Payee = {
  name: string;
  basis: "hourly" | "salary";
  rate: number;
  hours?: number | undefined;
  adjustments: readonly { label: string; amount: number }[];
  ruleRef: string;
  paidAt?: string | undefined;
};
type Run<T extends Payee> = {
  from: string;
  to: string;
  payDate: string;
  payees: readonly T[];
  style: "run" | "payslip";
  detail?: string | undefined;
  finalizedAt?: string | undefined;
  voided: boolean;
};

export function payrollGates<R extends Run<Payee>>(input: R) {
  const activeFinal = input.finalizedAt !== undefined && !input.voided;
  return {
    ...input,
    activeFinal,
    canFinalize: input.finalizedAt === undefined && !input.voided,
    canVoid: !input.voided && input.payees.every(({ paidAt }) => paidAt === undefined),
    payees: input.payees.map((row: R["payees"][number], index) => ({
      ...row,
      visible: input.style === "run" || index === 0,
      canRecord: activeFinal && row.paidAt === undefined,
    })),
  };
}

function earnings({ rate, hours }: Payee) {
  return rate * (hours ?? 1);
}

export function validGross(payee: Payee): boolean {
  const base = earnings(payee);
  const gross = payee.adjustments.reduce((total, { amount }) => total + amount, base);
  const magnitude = payee.adjustments.reduce((total, { amount }) => total + Math.abs(amount), base);
  // An exact zero can lie just below zero in JS (for example, three hours at 0.30 less 0.90).
  return Number.isFinite(magnitude) && gross >= -Number.EPSILON * magnitude;
}

const figureParts = ["net_pay", "gross", "deductions", "employer_cost"] as const;
type Figures = Record<(typeof figureParts)[number], number>;

function roundMinor(value: number) {
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute);
  const roundUp = absolute - whole >= 0.5 - Number.EPSILON * absolute;
  return Math.sign(value) * (whole + Number(roundUp));
}

function calculate(payee: Payee, config: Config | undefined, scale: number): Figures | undefined {
  const rule = config && Object.hasOwn(config.rates, payee.ruleRef) && config.rates[payee.ruleRef];
  if (!rule) return undefined;
  const lines = [earnings(payee), ...payee.adjustments.map(({ amount }) => amount)];
  const minor = lines.map((value) => roundMinor(value * scale));
  if (!minor.every(Number.isSafeInteger)) return undefined;
  const gross = minor.reduce((total, value) => total + value, 0);
  const deductions = roundMinor(gross * rule.deductionRate);
  const employerCost = gross + roundMinor(gross * rule.employerRate);
  const figures = { gross, deductions, net_pay: gross - deductions, employer_cost: employerCost };
  return gross >= 0 && deductions <= gross && Object.values(figures).every(Number.isSafeInteger)
    ? figures
    : undefined;
}

function totalFigures(rows: readonly (Figures | undefined)[]): Figures | undefined {
  const total = { net_pay: 0, gross: 0, deductions: 0, employer_cost: 0 };
  for (const row of rows) {
    if (!row) return undefined;
    for (const part of figureParts) total[part] += row[part];
  }
  return Object.values(total).every(Number.isSafeInteger) ? total : undefined;
}

function payeeCopy<T extends Payee>(
  payee: T,
  showDetail: boolean,
  money: (amount: number) => string,
  lang?: string,
) {
  const words = booksWordsFor(lang).payroll;
  const detail = showDetail
    ? {
        basis: words[payee.basis],
        rate: payee.basis === "hourly" ? words.hourRate(money(payee.rate)) : money(payee.rate),
        hours: payee.hours === undefined ? undefined : words.hoursWorked(numberLine(payee.hours, lang)),
      }
    : undefined;
  return {
    payee,
    paid: payee.paidAt
      ? words.field(words.paid, appointmentDate(payee.paidAt.slice(0, 10), lang))
      : undefined,
    detail,
    basisLine: detail && Object.values(detail).filter(Boolean).join(words.separator),
    adjustments: payee.adjustments.map(({ label, amount }) => words.field(label, money(amount))),
  };
}

export function payrollDisplay<T extends Payee>(input: Run<T>, data?: DeviceData, lang?: string) {
  const words = booksWordsFor(lang).payroll;
  const { data: config } = configuration.safeParse(data?.books_payroll_rules?.[0]);
  const currency = config?.currency ?? defaultCurrency;
  const format = new Intl.NumberFormat(localeOf(lang), { style: "currency", currency });
  const scale = 10 ** format.resolvedOptions().maximumFractionDigits!;
  const money = (amount: number) =>
    config ? moneyLine(amount, currency, undefined, lang) : numberLine(amount, lang);
  const figures = (amounts: Figures | undefined) =>
    figureParts.map((part) => ({
      part,
      label: words[part],
      value: amounts ? money(amounts[part] / scale) : words.unavailable,
    }));
  const amounts = input.payees.map((payee) => calculate(payee, config, scale));
  const total = totalFigures(amounts);
  const status = input.voided
    ? words.voided
    : input.payees.every(({ paidAt }) => paidAt)
      ? words.paid
      : input.finalizedAt
        ? words.finalized
        : words.draft;
  return {
    heading: words[input.style],
    status,
    from: appointmentDate(input.from, lang),
    to: appointmentDate(input.to, lang),
    payDate: words.field(words.payDate, appointmentDate(input.payDate, lang)),
    notice: total ? undefined : words.figuresUnavailable,
    totals: figures(total),
    rows: input.payees.map((payee, index) => ({
      ...payeeCopy(payee, input.detail !== "brief", money, lang),
      figures: figures(amounts[index]),
    })),
  };
}

export function payrollRead<T extends Payee>(
  input: Run<T> & { canFinalize?: boolean; canVoid?: boolean },
  state: string,
  data?: DeviceData,
  lang?: string,
) {
  const words = booksWordsFor(lang).payroll;
  const { heading, status, from, to, payDate, totals, rows, notice } = payrollDisplay(input, data, lang);
  const lines = [
    heading,
    `${from}${words.periodSeparator}${to}`,
    payDate,
    status,
    notice,
    ...(input.style === "run" ? totals.flatMap(({ label, value }) => [label, value]) : []),
    ...rows.flatMap(({ payee, basisLine, paid, adjustments, figures }) => [
      payee.name,
      basisLine,
      paid,
      ...(input.style === "payslip"
        ? [
            ...(adjustments.length ? [words.adjustments, ...adjustments] : []),
            ...figures.flatMap(({ label, value }) => [label, value]),
          ]
        : [figures[0]!.value]),
    ]),
    input.canFinalize && state === "filled" && words.finalize,
    input.canVoid && words.void,
    input.finalizedAt && !input.voided && words.send,
    input.finalizedAt && !input.voided && rows.some(({ payee }) => !payee.paidAt) && words.record,
  ];
  return lines.filter((line): line is string => Boolean(line));
}
