import {
  currencies,
  moneyLine,
  numberLine,
  pluralForm,
  type Currency,
  type StateName,
} from "../../../catalog";
import { commerceWordsFor, type CommerceWords } from "../lang";

/** CartBar and Checkout read the host's payable basket summary; CartBar also needs its item count. */
export function cartBarLines(
  records: readonly unknown[] | undefined,
  lang: string | undefined,
  words: CommerceWords["cartBar"],
) {
  const record = records?.[0];
  if (
    records?.length !== 1 ||
    !record ||
    typeof record !== "object" ||
    !("count" in record) ||
    !("total" in record)
  )
    return;
  const { count, total } = record;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1) return;
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) return;
  const currency = "currency" in record ? record.currency : undefined;
  if (currency !== undefined && !currencies.includes(currency as Currency)) return;
  return {
    label: words.view,
    count: words.count(numberLine(count, lang), pluralForm(count, lang) === "one"),
    total: moneyLine(total, currency as Currency | undefined, undefined, lang),
  };
}

export function cartBarReading(state: StateName, records: readonly unknown[] | undefined, lang?: string) {
  const lines = state === "filled" && cartBarLines(records, lang, commerceWordsFor(lang).cartBar);
  return lines ? [lines.label, lines.count, lines.total] : [];
}
