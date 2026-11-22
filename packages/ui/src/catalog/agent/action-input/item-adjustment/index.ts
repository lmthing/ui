import type { Definition } from "../../../probes";
import {
  adjustmentAt,
  isAdjustOnlyItem,
  parseControlProps,
  wireAdjustmentKey,
  type ScreenLike,
  type Values,
} from "../../index";

export function stageItemAdjustment(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  address: string,
  action: string,
  values: Values,
  planned?: ReturnType<typeof adjustmentAt>,
): boolean | undefined {
  if (action !== "increment" && action !== "decrement") return;
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!entry || !def?.meta.items?.adjust) return;
  const { id: _id, c: _c, state: _state, ...raw } = entry;
  const base = `${screen.id}/${id}`;
  const get = (part: string) => values[`${base}/${part}`];
  const props = parseControlProps(def, raw, get);
  const now = Number(get("$now") ?? Date.now());
  const adjustment = planned ?? adjustmentAt(def.meta, props, parts.join("/"), action, get, now);
  if (!isAdjustOnlyItem(adjustment, action)) return;
  const slot = wireAdjustmentKey(def, adjustment.key);
  if (adjustment.next === undefined || !slot) return false;
  values[`${base}/${slot}`] = adjustment.next;
  values[`${screen.id}/${address}`] = adjustment.next;
  return true;
}
