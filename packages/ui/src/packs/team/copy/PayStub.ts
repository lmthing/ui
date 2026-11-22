import { appointmentDate, moneyLine, numberLine, type AppCurrency } from "../../../catalog";
import { teamWordsFor } from "../lang";

type PayLine = { label: string; amount: number; hours?: number | undefined; rate?: number | undefined };
type PayData = {
  employee: string;
  periodFrom: string;
  periodTo: string;
  payDate: string;
  earnings: PayLine[];
  deductions: PayLine[];
  ytdGross?: number | undefined;
  ytdNet?: number | undefined;
};
type Entry = { label: string; amount: string; note?: string | undefined; part?: string | undefined };

export function payStubTotals({ earnings, deductions }: Pick<PayData, "earnings" | "deductions">) {
  const sum = (rows: PayLine[]) => rows.reduce((total, { amount }) => total + amount, 0);
  const gross = sum(earnings);
  const deducted = sum(deductions);
  return { gross, deducted, net: gross - deducted };
}

export function payStubDisplay(input: PayData, lang?: string, currency?: AppCurrency) {
  const words = teamWordsFor(lang).payStub;
  const money = (amount: number) => moneyLine(amount, currency, undefined, lang, "fixed");
  const entry = (label: string, amount: number, part?: string, note?: string): Entry => ({
    label,
    amount: money(amount),
    part,
    note: note || undefined,
  });
  const earning = ({ label, amount, hours, rate }: PayLine) =>
    entry(
      label,
      amount,
      undefined,
      words.pair([
        ...(hours === undefined ? [] : [words.hours(numberLine(hours, lang))]),
        ...(rate === undefined ? [] : [words.rate(money(rate))]),
      ]),
    );
  const { gross, deducted, net } = payStubTotals(input);
  return {
    employee: input.employee,
    period: words.period(appointmentDate(input.periodFrom, lang), appointmentDate(input.periodTo, lang)),
    paid: words.paid(appointmentDate(input.payDate, lang)),
    net: money(net),
    totals: [entry(words.gross, gross, "gross"), entry(words.deducted, deducted, "deducted")],
    earnings: input.earnings.map(earning),
    deductions: input.deductions.map(({ label, amount }) => entry(label, amount)),
    ytd: [
      ...(input.ytdGross === undefined ? [] : [entry(words.ytdGross, input.ytdGross, "ytd_gross")]),
      ...(input.ytdNet === undefined ? [] : [entry(words.ytdNet, input.ytdNet, "ytd_net")]),
    ],
  };
}

export function payStubReading(
  input: PayData & { detail: "full" | "brief" },
  lang?: string,
  currency?: AppCurrency,
) {
  const words = teamWordsFor(lang).payStub;
  const data = payStubDisplay(input, lang, currency);
  const line = ({ label, amount, note }: Entry) => words.line(label, amount, note);
  return [
    words.title,
    ...(input.detail === "brief" ? [] : [data.employee, data.period]),
    data.paid,
    words.line(words.net, data.net),
    ...data.totals.map(line),
    ...(input.detail === "brief"
      ? []
      : [
          words.earnings,
          ...data.earnings.map(line),
          ...(data.deductions.length ? [words.deductions, ...data.deductions.map(line)] : []),
          ...data.ytd.map(line),
        ]),
    words.export,
  ];
}
