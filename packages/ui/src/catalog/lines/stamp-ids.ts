import type { Meta } from "../meta";
import { collectionItem, collectionPrefixPattern, isCollectionItem } from "../address";

function checkCollections(meta: Meta, collections: NonNullable<Meta["collections"]>) {
  const keys = new Set([meta.items?.key]);
  const prefixes = new Set<string>();
  const selectors = new Set<string>();
  const parts = [...(meta.parts ?? []), ...Object.keys(meta.actions?.parts ?? {})];
  if (parts.some(isCollectionItem)) throw new Error("Component parts cannot use collection addresses");
  for (const { key, prefix, identity, select } of Object.values(collections)) {
    if (identity === "id" || !collectionPrefixPattern.test(prefix) || keys.has(key) || prefixes.has(prefix))
      throw new Error("Named collections require distinct keys and prefixes, and an identity other than id");
    if (meta.items?.prefix?.startsWith(`r_${prefix}_`))
      throw new Error("Named collection prefix overlaps the primary item prefix");
    keys.add(key);
    prefixes.add(prefix);
    if (select) {
      if (selectors.has(select.prop)) throw new Error("Named collections require independent selectors");
      selectors.add(select.prop);
    }
  }
  for (const prop of selectors)
    if (
      keys.has(prop) ||
      prop === meta.select?.prop ||
      Object.values(meta.selections ?? {}).some((selection) => selection.prop === prop)
    )
      throw new Error("Named collection selector overlaps an existing selection or collection");
}

export function stampCollections<P extends Record<string, unknown>>(meta: Meta, props: P): P {
  if (!meta.collections) return props;
  checkCollections(meta, meta.collections);
  for (const { key, prefix, identity } of Object.values(meta.collections)) {
    const rows = props[key];
    if (!Array.isArray(rows)) continue;
    const ids = new Set<string>();
    const stamped = rows.map((row: Record<string, unknown>) => {
      const value = row[identity];
      const id = collectionItem(prefix, String(value));
      if (
        !(
          typeof value === "string" ||
          (typeof value === "number" && Number.isSafeInteger(value) && value > 0)
        ) ||
        !isCollectionItem(id) ||
        ids.has(id)
      )
        throw new Error(`Invalid or duplicate identity in collection ${key}`);
      ids.add(id);
      return row.id === id ? row : { ...row, id };
    });
    if (stamped.some((row, at) => row !== rows[at])) props = { ...props, [key]: stamped };
  }
  return props;
}

/**
 * Give each item of a component its stable id (`r1`, `r2`, … or the meta's prefix), as the
 * validator does. Views receive these ids; the model never writes them.
 */
export function stampItemIds<P extends Record<string, unknown>>(meta: Meta, props: P): P {
  props = stampCollections(meta, props);
  const items = meta.items;
  if (!items) return props;
  const list = props[items.key];
  if (!Array.isArray(list)) return props;
  const prefix = items.prefix ?? "r";
  return {
    ...props,
    [items.key]: list.map((item: object, index) => ({ ...item, id: `${prefix}${index + 1}` })),
  };
}
