import {
  parseItemProps,
  stampItemIds,
  visibleItems,
  type Definition,
  type Meta,
  type Values,
} from "../../../catalog";

export function itemConfirmation(meta: Meta, input: Values, source: string, lang?: string) {
  const [component, id, part, extra] = source.split("/");
  if (!meta.confirmItem || !component || !id || !part || extra) return;
  const item = visibleItems(meta, stampItemIds(meta, input)).find((row) => row.id === id);
  return item && meta.confirmItem(item, part, lang);
}

export function matchesItemConfirmation(def: Definition, entry: Values, source: string, identity: string) {
  if (!def.meta.confirmItem) return false;
  const { c: _c, id: _id, state: _state, ...wire } = entry;
  try {
    return itemConfirmation(def.meta, parseItemProps(def, wire), source)?.identity === identity;
  } catch {
    return false;
  }
}
