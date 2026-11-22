import type { Meta } from "../meta";
import { collectionItem, collectionPrefixPattern, isCollectionItem } from "../address";
import type { Definition } from "../probes";
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
 * Project item addresses onto parsed view props. Hosts with a persistent snapshot pass its ids;
 * older callers without an allocation still get positional ids. Never put view ids on the wire.
 */
export function stampItemIds<P extends Record<string, unknown>>(
  meta: Meta,
  props: P,
  ids?: readonly string[],
): P {
  props = stampCollections(meta, props);
  const items = meta.items;
  if (!items) return props;
  const list = props[items.key];
  if (!Array.isArray(list)) return props;
  const prefix = items.prefix ?? "r";
  if (ids && !validItemIds(ids, prefix, list.length))
    throw new Error(`Item addresses do not match the parsed ${meta.id} rows`);
  return {
    ...props,
    [items.key]: list.map((item: object, index) => ({
      ...item,
      id: ids?.[index] ?? `${prefix}${index + 1}`,
    })),
  };
}

function validItemIds(ids: readonly string[], prefix: string, length: number): boolean {
  return (
    ids.length === length &&
    new Set(ids).size === length &&
    Array.from(ids).every(
      (id) =>
        typeof id === "string" && id.startsWith(prefix) && /^[1-9][0-9]*$/.test(id.slice(prefix.length)),
    )
  );
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

function parsedProps(def: Definition, component: PendingComponent): Record<string, unknown> | undefined {
  const { c: _c, id: _id, state: _state, ...wire } = component;
  return def.props.safeParse(wire).data;
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
  const defs = new Map(registry.defs.map((def) => [def.meta.id, def]));
  const stamped = components.map((component) => {
    const prefix = component.c[0]!.toLowerCase();
    let id = component.id;
    if (id === undefined || taken.has(id)) {
      do id = `${prefix}${advance(counts, prefix)}`;
      while (reserved.has(id));
    }
    taken.add(id);
    const def = defs.get(component.c);
    const list = def?.meta.items;
    const values = def && list && parsedProps(def, component)?.[list.key];
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
  const defs = new Map(registry.defs.map((def) => [def.meta.id, def]));
  return stamped.components.map((component) => {
    const def = defs.get(component.c);
    const props = def && parsedProps(def, component);
    if (!def || !props) return component;
    const { c, id, state } = component;
    const projected = stampItemIds(def.meta, props, stamped.itemIds[id]);
    return { ...projected, c, id, ...(state === undefined ? {} : { state }) };
  });
}
