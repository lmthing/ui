import type { Meta } from "../meta";
import { collectionItem, collectionPrefixPattern, isCollectionItem } from "../address";
import type { Component } from "../types";
import type { LineRegistry, PendingComponent } from "./repair-component";

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

/** High water marks for a single screen. Keep them when deleting components or rows. */
export type IdCounters = {
  components: Readonly<Record<string, number>>;
  items: Readonly<Record<string, number>>;
};

export type StampResult = {
  components: Component[];
  counters: IdCounters;
  itemIds: Record<string, string[]>;
};

// A large numeric suffix in a saved id is opaque, not a request to set a counter near exhaustion.
const maxSavedSequence = 2 ** 32 - 1;

function reserveComponentIds(components: readonly PendingComponent[], counts: Map<string, number>) {
  const reserved = new Set<string>();
  for (const { id } of components) {
    if (id === undefined) continue;
    reserved.add(id);
    const match = /^([a-z])([1-9][0-9]*)$/.exec(id);
    if (!match) continue;
    const prefix = match[1]!;
    const number = Number(match[2]);
    if (number <= maxSavedSequence) counts.set(prefix, Math.max(counts.get(prefix) ?? 0, number));
  }
  return reserved;
}

function advance(counts: Map<string, number>, key: string): number {
  const next = (counts.get(key) ?? 0) + 1;
  if (!Number.isSafeInteger(next)) throw new Error("Line id counter exhausted");
  counts.set(key, next);
  return next;
}

/** Allocate addresses without writing runtime ids over declared wire fields. */
export function stampIdsWithCounters(
  components: readonly PendingComponent[],
  registry: LineRegistry,
  previous?: IdCounters,
): StampResult {
  const counts = new Map(Object.entries(previous?.components ?? {}));
  const rows = new Map(Object.entries(previous?.items ?? {}));
  const reserved = reserveComponentIds(components, counts);
  const taken = new Set<string>();
  const items = new Map<string, string[]>();
  const metadata = new Map(registry.defs.map(({ meta }) => [meta.id, meta.items]));
  const stamped = components.map((component) => {
    const prefix = component.c[0]!.toLowerCase();
    let id = component.id;
    if (id === undefined || taken.has(id)) {
      do id = `${prefix}${advance(counts, prefix)}`;
      while (reserved.has(id));
    }
    taken.add(id);
    const list = metadata.get(component.c);
    const values = list && component[list.key];
    if (list && Array.isArray(values))
      items.set(
        id,
        values.map(() => `${list.prefix ?? "r"}${advance(rows, id)}`),
      );
    return { ...component, id };
  });
  return {
    components: stamped,
    counters: { components: Object.fromEntries(counts), items: Object.fromEntries(rows) },
    itemIds: Object.fromEntries(items),
  };
}

/** Project stamped components for address consumers; use the counter form for wire snapshots. */
export function stampIds(
  components: readonly PendingComponent[],
  registry: LineRegistry,
  previous?: IdCounters,
): Component[] {
  const stamped = stampIdsWithCounters(components, registry, previous);
  const metas = new Map(registry.defs.map(({ meta }) => [meta.id, meta]));
  return stamped.components.map((component) => {
    const meta = metas.get(component.c);
    if (!meta) return component;
    const ids = stamped.itemIds[component.id];
    const key = meta.items?.key;
    const rows = key ? component[key] : undefined;
    const projected = stampCollections(meta, component);
    if (!ids || !key || !Array.isArray(rows)) return projected;
    return { ...projected, [key]: rows.map((row: object, index) => ({ ...row, id: ids[index] })) };
  });
}
