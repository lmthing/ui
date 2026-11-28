import { compactMoneyLine, emptyLine, numberLine, type PhotoInput } from "../../../catalog";
import { inventoryWordsFor } from "../lang";

type Stock = { qty: number; min?: number | undefined };
type RecordCopy = Stock & { name: string; value?: number | undefined };
type ItemDetails = {
  serial?: string | undefined;
  condition?: "new" | "good" | "worn" | "damaged" | undefined;
  expected?: number | undefined;
};
type Filter = "all" | "low" | "missing";

export const inlineCountMax = 99;
export const isLowStock = ({ qty, min }: Stock) => min !== undefined && qty <= min;

export function matchesThingFilter(item: Stock, filter: Filter) {
  return filter === "low" ? isLowStock(item) : filter === "missing" ? item.qty === 0 : true;
}

export function thingMetadata({ serial, condition }: ItemDetails, lang?: string) {
  const words = inventoryWordsFor(lang).things;
  return [
    { part: "condition", text: condition && words.condition(condition) },
    { part: "serial", text: serial && words.serial(serial) },
  ] as const;
}

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

type ThingReading = RecordCopy & ItemDetails & { where?: string | undefined; photo?: PhotoInput | undefined };
export function thingsReading(
  {
    items,
    filter,
    style,
    scan,
  }: {
    items: readonly ThingReading[];
    filter: Filter;
    style?: "audit" | undefined;
    scan?: unknown;
  },
  lang?: string,
): string[] {
  const words = inventoryWordsFor(lang).things;
  const lines = items.length
    ? items.map((item) => {
        const { quantity, value, low, initials } = thingCopy(item, lang);
        const expected = item.expected === undefined ? undefined : numberLine(item.expected, lang);
        const counts =
          style === "audit"
            ? [
                ...(expected === undefined ? [] : [words.audit(words.expected, expected)]),
                words.audit(words.counted, quantity),
              ]
            : [words.quantity(quantity)];
        return words.reading([
          JSON.stringify(item.name),
          ...(item.photo ? [] : [initials]),
          ...counts,
          ...(item.min === undefined ? [] : [words.minimum(numberLine(item.min, lang))]),
          ...(item.where ? [JSON.stringify(item.where)] : []),
          ...(value ? [value] : []),
          ...(low ? [low] : []),
          ...thingMetadata(item, lang).flatMap(({ text }) => text ?? []),
        ]);
      })
    : [thingsEmpty(filter, lang).title];
  return scan ? [...lines, words.scan] : lines;
}

export function thingsEmpty(filter: Filter, lang?: string, thing?: string) {
  const words = inventoryWordsFor(lang).things;
  if (filter === "low") return { icon: "check" as const, title: words.stocked };
  if (filter === "missing") return { icon: "check" as const, title: words.complete };
  return { icon: "package" as const, title: emptyLine(thing, lang) };
}
