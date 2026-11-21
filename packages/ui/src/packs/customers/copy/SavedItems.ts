import { moneyLine, type AppCurrency } from "../../../catalog";
import { customersWordsFor } from "../lang";

type Billable = {
  rate: number;
  unit?: string | undefined;
  taxable: boolean;
};

export function savedItemDetails(row: Billable, lang?: string, currency?: AppCurrency) {
  const { savedItemLabels: copy } = customersWordsFor(lang);
  const amount = moneyLine(row.rate, currency, undefined, lang);
  return {
    amount,
    unit: row.unit ? copy.unit(row.unit) : "",
    tax: row.taxable ? copy.taxable : copy.taxExempt,
  };
}

/** Preserve first category appearance and relative order within each category. */
export function savedItemGroups<T extends { category?: string | undefined }>(items: readonly T[]) {
  const groups = new Map<string | undefined, T[]>();
  for (const item of items) {
    const rows = groups.get(item.category);
    if (rows) rows.push(item);
    else groups.set(item.category, [item]);
  }
  return [...groups].map(([category, rows]) => ({ category, rows }));
}
