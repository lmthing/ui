import type { Meta, NamedCollection, SlotMoves } from "../../meta";
import type { StateName } from "../../types";
import type { Values } from "../index";
import { boundActionAvailable } from "../selection-binding";
import { actionAllowedIn, addressedItems, matches } from "../visibility";

/** A view uses these choices for a named move; the dispatcher rechecks the same guards. */
export function slotMoveOffer(
  meta: Meta,
  props: Values,
  name: string,
  id: string,
  part: string,
  state: StateName,
) {
  if (!actionAllowedIn(meta, state, `${part}.move`) || !boundActionAvailable(meta, props, part, "move", true))
    return;
  return slotMoveOfferAt(meta, meta.errorActions ? { ...props, state } : props, name, id, part);
}

/** State, binding and clock restrictions are applied by the common affordance filter. */
export function slotMoveOfferAt(meta: Meta, props: Values, name: string, id: string, part: string) {
  const collection = Object.hasOwn(meta.collections ?? {}, name) ? meta.collections![name] : undefined;
  if (!collection?.parts.includes(part) || !collection.actions?.[part]?.includes("move")) return;
  const rows = addressedItems(meta, props, name);
  const row = rows.find((item) => item.id === id);
  const outer = { ...props, $first: row === rows[0] };
  if (
    !row ||
    !matches(collection.when?.[part], row, outer, meta.deviceDataFlags) ||
    !matches(collection.when?.[`${part}.move`], row, outer, meta.deviceDataFlags)
  )
    return;
  const slotMove = slotMovePlan(collection, rows, id, part, props, (item) =>
    matches(collection.visibleWhen, item, props, meta.deviceDataFlags),
  );
  if (slotMove) return { move: { current: id, choices: [...slotMove.orders.keys()] }, slotMove };
}

type Spec = SlotMoves[string];
type Guard = (row: Values, destination: Values) => boolean;
const slotKey = (collection: NamedCollection) => `$slots/${collection.prefix}`;

/** Destinations refer to the slot currently occupied by that row, not to a mutable index. */
export function moveSlots<T>(rows: readonly T[], from: number, to: number, mode: Spec["mode"]): T[] {
  const next = [...rows];
  if (mode === "swap") [next[to], next[from]] = [rows[from]!, rows[to]!];
  else next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

export function slotMovePlan(
  collection: NamedCollection,
  rows: Values[],
  id: string,
  part: string,
  props: Values,
  visible: (row: Values) => boolean,
) {
  const spec = Object.hasOwn(collection.slotMoves ?? {}, part) && collection.slotMoves![part];
  if (!spec) return;
  const from = rows.findIndex((row) => row.id === id);
  const source = rows[from];
  const available = (row: Values) => visible(row) && (!spec.locked || row[spec.locked] !== true);
  if (!source || !available(source)) return;
  const canMove: Guard = (row, destination) =>
    available(row) && available(destination) && (!spec.allows || spec.allows(row, destination, props));
  const orders = new Map<string, string[]>();
  rows.forEach((destination, to) => {
    if (from === to || typeof destination.id !== "string" || !canMove(source, destination)) return;
    const order = moveSlots(rows, from, to, spec.mode);
    if (order.every((row, at) => row === rows[at] || canMove(row, rows[at]!)))
      orders.set(
        destination.id,
        order.map((row) => String(row.id)),
      );
  });
  if (orders.size) return { key: slotKey(collection), orders };
}

/** Project a permutation only while it still describes the whole collection. */
export function orderedSlots(collection: NamedCollection, rows: Values[], get: (part: string) => unknown) {
  if (!collection.slotMoves) return rows;
  const order = get(slotKey(collection));
  if (!Array.isArray(order) || order.length !== rows.length || new Set(order).size !== rows.length)
    return rows;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const next = order.map((id) => byId.get(id));
  return next.every((row) => row !== undefined) ? next : rows;
}
