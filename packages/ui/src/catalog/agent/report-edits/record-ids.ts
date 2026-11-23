import type { Meta } from "../../meta";
import { hasHostItemAddress } from "../../lines";
import type { Values } from "../act";
import { recordKey } from "../device-data";
import { addressedItems } from "../visibility";
import { recordPartition } from "./wire-edits";

type Ids = Readonly<Record<string, number | string>>;
const slot = (meta: Meta, props: Values) => `$recordIds/${recordPartition(meta, props)}`;
const itemId = (prefix: string, id: number | string) => (typeof id === "string" ? id : `${prefix}${id}`);

/** Keep the original address for surviving rows and never reuse a removed row's address. */
export function rememberRecordIds(meta: Meta, props: Values, values: Values, base: string, added?: Values) {
  const keys = meta.items?.records?.keys;
  if (!keys) return;
  const path = `${base}/${slot(meta, props)}`;
  const ids = { ...(values[path] as Ids | undefined) };
  const prefix = meta.items?.prefix ?? "r";
  addressedItems(meta, props).forEach((row, index) => {
    const key = recordKey(row, keys);
    if (key !== undefined && (hasHostItemAddress(row) || !Object.hasOwn(ids, key)))
      ids[key] = typeof row.id === "string" && row.id !== `${prefix}${index + 1}` ? row.id : index + 1;
  });
  const next = added && recordKey(added, keys);
  if (next !== undefined) {
    const saved = Object.values(ids);
    const reserved = new Set(saved.map((id) => itemId(prefix, id)));
    let ordinal = Math.max(0, ...saved.filter((id): id is number => typeof id === "number")) + 1;
    while (reserved.has(itemId(prefix, ordinal))) ordinal++;
    ids[next] = ordinal;
  }
  values[path] = ids;
}

export function projectRecordIds(meta: Meta, props: Values, get: (part: string) => unknown) {
  const items = meta.items;
  const ids = items?.records && (get(slot(meta, props)) as Ids | undefined);
  if (!items?.records || !ids) return props;
  return {
    ...props,
    [items.key]: addressedItems(meta, props).map((row) => {
      if (hasHostItemAddress(row)) return row;
      const key = recordKey(row, items.records!.keys);
      const id = key !== undefined ? ids[key] : undefined;
      return id === undefined ? row : { ...row, id: itemId(items.prefix ?? "r", id) };
    }),
  };
}
