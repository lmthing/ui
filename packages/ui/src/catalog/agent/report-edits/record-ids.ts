import type { Meta } from "../../meta";
import type { Values } from "../act";
import { recordKey } from "../device-data";
import { addressedItems } from "../visibility";
import { recordPartition } from "./wire-edits";

type Ids = Readonly<Record<string, number>>;
const slot = (meta: Meta, props: Values) => `$recordIds/${recordPartition(meta, props)}`;

/** Keep the original ordinal for surviving rows and never reuse a removed row's address. */
export function rememberRecordIds(meta: Meta, props: Values, values: Values, base: string, added?: Values) {
  const keys = meta.items?.records?.keys;
  if (!keys) return;
  const path = `${base}/${slot(meta, props)}`;
  const ids = { ...(values[path] as Ids | undefined) };
  addressedItems(meta, props).forEach((row, index) => {
    const key = recordKey(row, keys);
    if (key !== undefined && !Object.hasOwn(ids, key)) ids[key] = index + 1;
  });
  const next = added && recordKey(added, keys);
  if (next !== undefined) ids[next] = Math.max(0, ...Object.values(ids)) + 1;
  values[path] = ids;
}

export function projectRecordIds(meta: Meta, props: Values, get: (part: string) => unknown) {
  const items = meta.items;
  const ids = items?.records && (get(slot(meta, props)) as Ids | undefined);
  if (!items?.records || !ids) return props;
  return {
    ...props,
    [items.key]: addressedItems(meta, props).map((row) => {
      const key = recordKey(row, items.records!.keys);
      const id = key !== undefined ? ids[key] : undefined;
      return id === undefined ? row : { ...row, id: `${items.prefix ?? "r"}${id}` };
    }),
  };
}
