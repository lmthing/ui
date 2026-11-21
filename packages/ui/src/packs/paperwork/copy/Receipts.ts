import {
  appointmentDate,
  currencies,
  defaultCurrency,
  moneyLine,
  percentageLine,
  type Currency,
  type DeviceData,
} from "../../../catalog";
import { paperworkWordsFor } from "../lang";

type Receipt = {
  date: string;
  amount: number;
  allocation?: number | undefined;
  category?: string | undefined;
  file?: string | undefined;
  tags: readonly string[];
};
type Line = { part: string; line: string };

export function receiptCurrency(data?: DeviceData): Currency {
  const code = data?.currency?.[0];
  return currencies.find((currency) => currency === code) ?? defaultCurrency;
}

export function receiptDetails(row: Receipt, currency: Currency, lang?: string, reading = false): Line[] {
  const words = paperworkWordsFor(lang).receipts;
  const money = (amount: number) => moneyLine(amount, currency, undefined, lang);
  const lines: Line[] = [
    { part: "amount", line: money(row.amount) },
    { part: "date", line: appointmentDate(row.date, lang) },
  ];
  if (row.category) lines.push({ part: "category", line: row.category });
  if (row.allocation !== undefined) {
    const share = row.amount * (row.allocation / 100);
    lines.push({ part: "allocation", line: words.allocation(percentageLine(row.allocation, lang)) });
    lines.push({ part: "allocated_amount", line: reading ? words.allocated(money(share)) : money(share) });
  }
  if (row.file) lines.push({ part: "file", line: reading ? words.privateFile : words.attached });
  if (row.tags.length) lines.push({ part: "tags", line: row.tags.join(words.separator) });
  return lines;
}
