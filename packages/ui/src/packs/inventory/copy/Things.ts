import { compactMoneyLine, emptyLine, numberLine } from "../../../catalog";
import { inventoryWordsFor } from "../lang";

type Stock = { qty: number; min?: number | undefined };
type RecordCopy = Stock & { name: string; value?: number | undefined };

export const isLowStock = ({ qty, min }: Stock) => min !== undefined && qty <= min;

export function thingCopy(record: RecordCopy, lang?: string) {
  return {
    initials: record.name
      .split(/\s+/, 2)
      .map((word) => Array.from(word)[0])
      .join("")
      .toLocaleUpperCase(lang),
    quantity: numberLine(record.qty, lang),
    value: record.value === undefined ? undefined : compactMoneyLine(record.value, undefined, lang),
    low: isLowStock(record) ? inventoryWordsFor(lang).things.low : undefined,
  };
}

type ThingReading = RecordCopy & { where?: string | undefined; photo?: string | undefined };
export function thingsReading(
  { items, filter }: { items: readonly ThingReading[]; filter: "all" | "low" },
  lang?: string,
): string[] {
  const words = inventoryWordsFor(lang).things;
  if (!items.length) return [thingsEmpty(filter, lang).title];
  return items.map((item) => {
    const { quantity, value, low, initials } = thingCopy(item, lang);
    return words.reading([
      JSON.stringify(item.name),
      ...(item.photo ? [] : [initials]),
      words.quantity(quantity),
      ...(item.min === undefined ? [] : [words.minimum(numberLine(item.min, lang))]),
      ...(item.where ? [JSON.stringify(item.where)] : []),
      ...(value ? [value] : []),
      ...(low ? [low] : []),
    ]);
  });
}

export function thingsEmpty(filter: "all" | "low", lang?: string, thing?: string) {
  return filter === "low"
    ? { icon: "check" as const, title: inventoryWordsFor(lang).things.stocked }
    : { icon: "package" as const, title: emptyLine(thing, lang) };
}
