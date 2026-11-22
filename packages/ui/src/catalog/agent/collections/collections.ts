import { stampCollections } from "../../lines";
import type { Meta, NamedCollection } from "../../meta";
import type { Affordance, Values } from "../index";
import { hasNestedCollectionControls } from "../nested";
import { projectNested } from "../selection";
import { addressedItems, visibleItems } from "../visibility";
import { partsOf } from "../action-input";
import { orderedSlots, slotMoveOfferAt } from "./slot-move";

const selectionKey = (collection: NamedCollection) => `$collection/${collection.prefix}/selected`;
const flagKey = (id: unknown, prop: string) => `$collection/${String(id)}/${prop}`;

function rowValue(collection: NamedCollection, row: Values) {
  const value = row[collection.select?.field ?? "id"];
  if ((typeof value === "string" && value.length) || (typeof value === "number" && Number.isFinite(value)))
    return value;
}

export function projectCollections(meta: Meta, props: Values, get: (part: string) => unknown) {
  if ((meta.live?.derive || meta.recordRuntime) && hasNestedCollectionControls(meta))
    props = projectNested(meta, props, get);
  if (!meta.collections) return props;
  let live = stampCollections(meta, props);
  for (const [name, collection] of Object.entries(meta.collections)) {
    if (!Array.isArray(live[collection.key])) continue;
    const rows = addressedItems(meta, live, name);
    const flagged = collection.toggles
      ? rows.map((row) => {
          for (const prop of Object.values(collection.toggles!)) {
            const value = get(flagKey(row.id, prop));
            if (typeof value === "boolean") row = { ...row, [prop]: value };
          }
          return row;
        })
      : rows;
    const ordered = orderedSlots(collection, flagged, get);
    if (ordered !== rows) live = { ...live, [collection.key]: ordered };
    const selected = ordered.find((row) => row.id === get(selectionKey(collection)));
    if (collection.select && selected)
      live = { ...live, [collection.select.prop]: rowValue(collection, selected) };
  }
  return live;
}

function collectionOffer(
  meta: Meta,
  collection: NamedCollection,
  name: string,
  props: Values,
  row: Values,
  offer: Affordance,
): Affordance[] {
  const { part, action } = offer;
  const id = String(row.id);
  if (!collection.parts.includes(part)) return [];
  if (action === "move") {
    const move = slotMoveOfferAt(meta, props, name, id, part);
    return move ? [{ ...offer, ...move }] : [];
  }
  if (action === "select") {
    const value = rowValue(collection, row);
    if (!collection.select || value === undefined) return [];
    const selected = props[collection.select.prop] === value;
    return [
      {
        ...offer,
        detail: selected ? ` = ${JSON.stringify(value)}` : "",
        rowSelection: { key: selectionKey(collection), id, value },
      },
    ];
  }
  if (action === "toggle" || action === "check") {
    const prop = collection.toggles?.[part];
    if (!prop || typeof row[prop] !== "boolean") return [];
    const detail = action === "check" ? (row[prop] ? ":done" : ":todo") : row[prop] ? ":on" : ":off";
    return [{ ...offer, detail, flagKey: flagKey(id, prop) }];
  }
  return [offer];
}

export function collectionOffers(meta: Meta, props: Values, instance: string): Affordance[] {
  if (!meta.collections) return [];
  const { items: _items, select: _select, actions: _actions, recordRuntime: _records, ...scope } = meta;
  return Object.entries(meta.collections).flatMap(([name, collection]) => {
    const [first] = addressedItems(meta, props, name);
    return visibleItems(meta, props, name).flatMap((row) =>
      partsOf(
        collection.actions,
        row,
        `${instance}/${String(row.id)}`,
        collection.when,
        { ...props, $first: row === first },
        scope,
        true,
      ).flatMap((offer) => collectionOffer(meta, collection, name, props, row, offer)),
    );
  });
}
