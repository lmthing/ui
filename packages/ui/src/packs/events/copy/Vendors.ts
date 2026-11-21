import { appointmentDate, compactMoneyLine } from "../../../catalog";
import { eventsWordsFor, type EventsWords } from "../lang";

type Payment = { cost: number; paid: number };
type Vendor = Payment & {
  role: keyof EventsWords["vendors"]["roles"];
  name: string;
  due?: string | undefined;
  booked: boolean;
  phone?: string | undefined;
};

type Detail = "full" | "brief";

export function vendorAmounts(vendors: readonly Payment[], summary: boolean, lang?: string) {
  const words = eventsWordsFor(lang).vendors;
  const { cost, paid } = vendors.reduce(
    (sum, vendor) => ({
      cost: sum.cost + Math.round((vendor.cost + Number.EPSILON) * 100),
      paid: sum.paid + Math.round((vendor.paid + Number.EPSILON) * 100),
    }),
    { cost: 0, paid: 0 },
  );
  const format = (cents: number) => compactMoneyLine(cents / 100, undefined, lang);
  const figures = [
    { part: "cost", label: summary ? words.total : words.cost, value: format(cost) },
    { part: "paid", label: summary ? words.totalPaid : words.paid, value: format(paid) },
    { part: "balance", label: summary ? words.totalLeft : words.balance, value: format(cost - paid) },
  ] as const;
  return summary ? ([figures[2], figures[0], figures[1]] as const) : figures;
}

export function vendorCopy(row: Vendor, detail: Detail, lang?: string) {
  const words = eventsWordsFor(lang).vendors;
  return {
    booked: words.status(words.roles[row.role], row.booked ? words.booked : words.unbooked),
    due: detail === "full" && row.due ? words.due(appointmentDate(row.due, lang)) : undefined,
    call: row.phone ? words.call(row.name) : undefined,
  };
}

export function vendorReading(vendors: readonly Vendor[], detail: Detail, lang?: string): string[] {
  const { amount } = eventsWordsFor(lang).vendors;
  const readings = (rows: readonly Payment[], summary: boolean) =>
    vendorAmounts(rows, summary, lang).map(({ label, value }) => amount(label, value));
  return [
    ...readings(vendors, true),
    ...vendors.map((row, index) => {
      const { booked, due, call } = vendorCopy(row, detail, lang);
      const lines = [booked, ...readings([row], false), due, call];
      return `r${index + 1}: ${lines.filter(Boolean).join(" · ")}`;
    }),
  ];
}
