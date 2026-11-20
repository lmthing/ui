import { appointmentDate, compactMoneyLine, dateLocaleOf } from "../../../catalog";
import { moneyWordsFor } from "../lang";

type Bill = {
  name: string;
  amount: number;
  due?: string | undefined;
  repeat: "never" | "weekly" | "monthly" | "yearly";
  paid: boolean;
};
type View = { bills: readonly Bill[]; style: "due" | "subscriptions"; detail?: "full" | "brief" };
const paymentsPerYear = { never: 0, weekly: 52, monthly: 12, yearly: 1 };

export function localBillDate(now = new Date()): string {
  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function orderedBills<T extends Bill>(bills: readonly T[], style: View["style"]): T[] {
  return [...bills].sort((a, b) =>
    style === "subscriptions" ? b.amount - a.amount : (a.due ?? "\uffff").localeCompare(b.due ?? "\uffff"),
  );
}

export function billLines(bill: Bill, today: string, lang?: string, detail = "full") {
  const words = moneyWordsFor(lang).bills;
  const due = bill.due && appointmentDate(bill.due, lang);
  const shortDue =
    bill.due && bill.due.slice(0, 4) === today.slice(0, 4)
      ? new Intl.DateTimeFormat(dateLocaleOf(lang), {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }).format(new Date(`${bill.due}T00:00:00Z`))
      : due;
  return {
    amount: compactMoneyLine(bill.amount, undefined, lang),
    due,
    shortDue,
    repeat: detail === "brief" || bill.repeat === "never" ? undefined : words.repeat[bill.repeat],
    overdue: !bill.paid && bill.due !== undefined && bill.due < today,
  };
}

export function billTotalLine({ bills, style }: View, today: string, lang?: string) {
  const words = moneyWordsFor(lang).bills;
  const yearly = style === "subscriptions";
  const recurring = bills.reduce((sum, bill) => sum + bill.amount * paymentsPerYear[bill.repeat], 0);
  const oneOff = yearly
    ? 0
    : bills
        .filter(
          (bill) => bill.repeat === "never" && (!bill.due || bill.due.slice(0, 7) === today.slice(0, 7)),
        )
        .reduce((sum, bill) => sum + bill.amount, 0);
  const total = Math.round((yearly ? recurring : recurring / 12 + oneOff) * 100) / 100;
  return { label: yearly ? words.year : words.month, amount: compactMoneyLine(total, undefined, lang) };
}

export function billsReading(input: View, lang?: string): string[] {
  const today = localBillDate();
  const total = billTotalLine(input, today, lang);
  const words = moneyWordsFor(lang).bills;
  return [
    ...orderedBills(input.bills, input.style).flatMap((bill) => {
      const { amount, due, repeat } = billLines(bill, today, lang, input.detail);
      const schedule = [repeat, due && words.due(due.replace(/\s/g, "\u00a0"))]
        .filter(Boolean)
        .join(words.separator);
      return schedule ? [bill.name, amount, schedule] : [bill.name, amount];
    }),
    total.label,
    total.amount,
  ];
}
