import { localeOf, numberLine } from "../../../catalog";
import { teamWordsFor } from "../lang";

type Balance = {
  label: string;
  accrued: number;
  used: number;
  pending: number;
  cap?: number | undefined;
  expiresOn?: string | undefined;
};
type Unit = "hours" | "days";

export function leaveBalanceFigures(row: Balance, unit: Unit, lang?: string) {
  const words = teamWordsFor(lang).leaveBalance;
  const format = (value: number) => words[unit](numberLine(value, lang));
  const available = row.accrued - row.used - row.pending;
  const date =
    row.expiresOn &&
    new Intl.DateTimeFormat(localeOf(lang), {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(row.expiresOn));
  return {
    available: format(available),
    ratio: row.accrued > 0 ? Math.max(0, available / row.accrued) : 0,
    cap: row.cap === undefined ? undefined : format(row.cap),
    lines: {
      accrued: format(row.accrued),
      used: format(row.used),
      pending: format(row.pending),
    },
    expires: date ? words.expires(date) : undefined,
  };
}

export function leaveBalanceReading(
  input: { balances: Balance[]; employee?: string | undefined; unit: Unit; detail: "full" | "brief" },
  lang?: string,
) {
  const words = teamWordsFor(lang).leaveBalance;
  const balances = input.balances.map((row) => {
    const { available, lines, cap, expires } = leaveBalanceFigures(row, input.unit, lang);
    const summary = words.balance(row.label, available);
    return input.detail === "brief"
      ? summary
      : [
          summary,
          words.remaining(lines.accrued),
          words.labeled(words.accrualLabel(cap), lines.accrued),
          words.labeled(words.used, lines.used),
          words.labeled(words.pending, lines.pending),
          expires,
        ]
          .filter(Boolean)
          .join(" · ");
  });
  return [words.title, ...(input.employee ? [input.employee] : []), ...balances, words.request];
}
