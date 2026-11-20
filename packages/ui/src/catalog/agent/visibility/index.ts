import type { Meta } from "../../meta";
import type { Values } from "../index";

/** A rule reads from the item first, then from its component. */
export function matches(
  rule: Readonly<Record<string, string | boolean>> | undefined,
  holder: Values,
  outer: Values,
): boolean {
  return (
    !rule ||
    Object.entries(rule).every(([key, value]) => (key in holder ? holder[key] : outer[key]) === value)
  );
}

export function addressedItems(meta: Meta, props: Values): Values[] {
  const key = meta.items?.key;
  return key && Array.isArray(props[key]) ? (props[key] as Values[]) : [];
}

/** Filter already addressed items without compacting the original address space. */
export function visibleItems<T extends Values = Values>(meta: Meta, props: Values): T[] {
  const rows = addressedItems(meta, props);
  const rule = meta.items?.visibleWhen;
  return (rule ? rows.filter((row) => matches(rule, row, props)) : rows) as T[];
}

export function projectVisibleItems(meta: Meta, props: Values): Values {
  const items = meta.items;
  return items?.visibleWhen ? { ...props, [items.key]: visibleItems(meta, props) } : props;
}
