import { z } from "zod";
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

type Values = Record<string, unknown>;
const rowIndex = Symbol("host row index");
const hostAddress = Symbol("host row address");
type TracedRow = Values & { [rowIndex]?: number; [hostAddress]?: true };
export const hasHostItemAddress = (row: TracedRow) => row[hostAddress] === true;
type RowIds = {
  ids: ReadonlyMap<string, readonly unknown[]>;
  onRow?: (key: string, index: number, id: string, repaired: boolean) => void;
  traced?: boolean;
  invalidProps?: boolean;
};

function allocate(
  candidates: readonly unknown[],
  valid: (id: unknown) => id is string,
  fallback: (index: number) => string,
  sequential: (n: number) => string,
) {
  const taken = new Set<string>();
  const kept = candidates.map((id) => {
    if (!valid(id) || taken.has(id)) return undefined;
    taken.add(id);
    return id;
  });
  // Keep unoccupied positional and identity defaults before generating replacements.
  const defaults = kept.map((id, index) => {
    if (id !== undefined) return id;
    const next = fallback(index);
    if (taken.has(next)) return undefined;
    taken.add(next);
    return next;
  });
  return defaults.map((id, index) => {
    if (id !== undefined) return id;
    let next = sequential(index + 1);
    for (let n = index + 2; taken.has(next); n++) next = sequential(n);
    taken.add(next);
    return next;
  });
}

function wireIndex(row: TracedRow, index: number, key: string, source?: RowIds) {
  return source?.traced && source.ids.has(key) ? row?.[rowIndex] : index;
}

function rowIds(rows: readonly TracedRow[], key: string, source?: RowIds) {
  const ids = source?.ids.get(key);
  const first = new Map<unknown, number>();
  ids?.forEach((id, index) => {
    if (!first.has(id)) first.set(id, index);
  });
  return rows.map((row, index) => {
    if (!source) return row?.id;
    const at = wireIndex(row, index, key, source);
    const id = at === undefined ? undefined : ids?.[at];
    return first.get(id) === at ? id : undefined;
  });
}

function attachIds(rows: readonly TracedRow[], ids: readonly string[], key: string, source?: RowIds) {
  const supplied = source?.ids.get(key);
  return rows.map((row, index) => {
    const id = ids[index]!;
    const at = wireIndex(row, index, key, source);
    if (at !== undefined) {
      const repaired = Boolean(supplied && Object.hasOwn(supplied, at) && supplied[at] !== id);
      source?.onRow?.(key, at, id, repaired);
    }
    if (row?.[rowIndex] !== undefined) {
      const { [rowIndex]: _index, ...fields } = row;
      return { ...fields, id, [hostAddress]: true };
    }
    return row?.id === id ? row : { ...row, id };
  });
}

function identityIds(
  rows: readonly Values[],
  { key, prefix, identity }: NonNullable<Meta["collections"]>[string],
  lenient: boolean,
) {
  const seen = new Set<string>();
  return rows.map((row) => {
    const value = row?.[identity];
    const id = collectionItem(prefix, String(value));
    if (
      !(
        typeof value === "string" ||
        (typeof value === "number" && Number.isSafeInteger(value) && value > 0)
      ) ||
      !isCollectionItem(id) ||
      seen.has(id)
    ) {
      if (lenient) return undefined;
      throw new Error(`Invalid or duplicate identity in collection ${key}`);
    }
    seen.add(id);
    return id;
  });
}

export function stampCollections<P extends Values>(meta: Meta, props: P, source?: RowIds): P {
  if (!meta.collections) return props;
  checkCollections(meta, meta.collections);
  for (const collection of Object.values(meta.collections)) {
    const { key, prefix } = collection;
    const rows = props[key];
    if (!Array.isArray(rows)) continue;
    const fallback = identityIds(rows, collection, Boolean(source?.invalidProps));
    const sequential = (n: number) => collectionItem(prefix, n);
    const ids = allocate(
      rowIds(rows, key, source),
      (id): id is string => validNamedId(id, prefix),
      (index) => fallback[index] ?? sequential(index + 1),
      sequential,
    );
    const stamped = attachIds(rows, ids, key, source);
    if (stamped.some((row, at) => row !== rows[at])) props = { ...props, [key]: stamped };
  }
  return props;
}

/**
 * Keep host item addresses and fill missing ones. Wire snapshots without host ids retain
 * positional primary ids and identity-based named ids. The legacy explicit allocation stays strict.
 */
export function stampItemIds<P extends Values>(
  meta: Meta,
  props: P,
  ids?: readonly string[],
  source?: RowIds,
): P {
  props = stampCollections(meta, props, source);
  const items = meta.items;
  if (!items) return props;
  const list = props[items.key];
  if (!Array.isArray(list)) return props;
  const prefix = items.prefix ?? "r";
  if (ids && !validItemIds(ids, prefix, list.length))
    throw new Error(`Item addresses do not match the parsed ${meta.id} rows`);
  const sequential = (n: number) => `${prefix}${n}`;
  const stamped =
    ids ??
    allocate(
      rowIds(list, items.key, source),
      (id): id is string => validItemId(id, prefix),
      (index) => sequential(index + 1),
      sequential,
    );
  return { ...props, [items.key]: attachIds(list, stamped, items.key, source) };
}

const validItemId = (id: unknown, prefix: string): id is string =>
  typeof id === "string" && id.startsWith(prefix) && /^[1-9][0-9]*$/.test(id.slice(prefix.length));
const validNamedId = (id: unknown, prefix: string): id is string =>
  typeof id === "string" && id.startsWith(`r_${prefix}_`) && isCollectionItem(id);

function validItemIds(ids: readonly string[], prefix: string, length: number): boolean {
  return (
    ids.length === length &&
    new Set(ids).size === length &&
    Array.from(ids).every((id) => validItemId(id, prefix))
  );
}

function hasWireId(schema: z.ZodType | undefined, array = true): boolean {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodPrefault
  )
    return hasWireId(schema.unwrap() as z.ZodType, array);
  if (schema instanceof z.ZodPipe) return hasWireId(schema.in as z.ZodType, array);
  if (schema instanceof z.ZodUnion)
    return schema.options.some((option) => hasWireId(option as z.ZodType, array));
  if (array) return schema instanceof z.ZodArray && hasWireId(schema.element as z.ZodType, false);
  return schema instanceof z.ZodObject && Object.hasOwn(schema.shape, "id");
}

/** Separate host addresses before strict wire validation; declared domain ids are still wire fields. */
export function hostItemInput(def: Definition, input: Values) {
  const keys = [
    ...(def.meta.items ? [def.meta.items.key] : []),
    ...Object.values(def.meta.collections ?? {}).map(({ key }) => key),
  ];
  const ids = new Map<string, unknown[]>();
  let wire = input;
  for (const key of keys) {
    const rows = input[key];
    if (
      !Array.isArray(rows) ||
      !rows.some((row) => row && typeof row === "object" && Object.hasOwn(row, "id")) ||
      hasWireId(def.props.shape[key])
    )
      continue;
    const supplied: unknown[] = [];
    const stripped = rows.map((row, index) => {
      if (!row || typeof row !== "object" || !Object.hasOwn(row, "id")) return row;
      const { id, ...fields } = row as Values;
      supplied[index] = id;
      return fields;
    });
    ids.set(key, supplied);
    wire = { ...wire, [key]: stripped };
  }
  return { wire, ids };
}

function traceHostRows(def: Definition, ids: RowIds["ids"]) {
  if (!ids.size) return def.props;
  const fields = Object.fromEntries(
    [...ids.keys()].flatMap((key) => {
      const field = def.props.shape[key];
      // Tag validated rows before component-level transforms can reorder or copy them.
      return field
        ? [
            [
              key,
              field.overwrite((rows: unknown) =>
                Array.isArray(rows) ? rows.map((row, index) => ({ ...row, [rowIndex]: index })) : rows,
              ),
            ],
          ]
        : [];
    }),
  );
  return def.props.safeExtend(fields);
}

export function safeParseItemProps(def: Definition, input: Values, onRow?: RowIds["onRow"]) {
  return parseHostRows(def, hostItemInput(def, input), onRow);
}

function parseHostRows(
  def: Definition,
  { wire, ids }: ReturnType<typeof hostItemInput>,
  onRow?: RowIds["onRow"],
) {
  const parsed = traceHostRows(def, ids).safeParse(wire);
  const report = onRow ? { onRow } : {};
  if (parsed.success)
    return {
      wire,
      parsed: {
        success: true as const,
        data: stampItemIds(def.meta, parsed.data, undefined, { ids, traced: true, ...report }),
      },
    };
  if (onRow) stampItemIds(def.meta, wire, undefined, { ids, invalidProps: true, ...report });
  return { wire, parsed };
}

/** Return allocated primary ids in source order for wire projections that edit rows by index. */
export function hostWireItemIds(def: Definition, input: Values): readonly (string | undefined)[] | undefined {
  const key = def.meta.items?.key;
  if (!key) return;
  const prepared = hostItemInput(def, input);
  if (!prepared.ids.has(key)) return;
  const rows: string[] = [];
  parseHostRows(def, prepared, (collection, index, id) => {
    if (collection === key) rows[index] = id;
  });
  return rows;
}

export function parseItemProps(def: Definition, input: unknown): Values {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return stampItemIds(def.meta, def.props.parse(input));
  const { parsed } = safeParseItemProps(def, input as Values);
  if (!parsed.success) throw parsed.error;
  return parsed.data;
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
