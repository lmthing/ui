import type { Meta } from "../../../meta";
import type { DeviceData, Values } from "../../index";
import { componentSetAt, effectiveLimits, isNumericSet, keyFor } from "../component-sets";
import { clockRows } from "../clock";
import { tracksBounds } from "./range";

export const rowId = (meta: Meta, row: Values, index: number) =>
  String(row.id ?? `${meta.items?.prefix ?? "r"}${index + 1}`);

export function itemSetAt(meta: Meta, props: Values, target: string, data?: DeviceData) {
  const sets = meta.items?.set;
  if (!sets) return;
  const [id, part = "root", ...rest] = target.split("/");
  if (rest.length || !Object.hasOwn(sets, part)) return;
  const spec = sets[part]!;
  const holder = clockRows(props[meta.items!.key]).find((row, index) => rowId(meta, row, index) === id);
  if (holder)
    return {
      key: keyFor(`${id}/`, spec.prop),
      spec: effectiveLimits(meta, spec, meta.items?.adjust, props, holder, data),
      value: holder[spec.prop],
    };
}

export function numericSetAt(meta: Meta, props: Values, target: string, data?: DeviceData) {
  const item = itemSetAt(meta, props, target, data);
  if (item) return item;
  const set = componentSetAt(meta, props, target);
  if (set && isNumericSet(set.spec))
    return { ...set, spec: effectiveLimits(meta, set.spec, meta.adjust, props, props, data) };
}

export function setAt(meta: Meta, props: Values, target: string, data?: DeviceData) {
  return numericSetAt(meta, props, target, data) ?? componentSetAt(meta, props, target);
}

export function declaresNumericLimits(meta: Meta, part: string, item: boolean) {
  const spec = (item ? meta.items?.set : meta.set)?.[part];
  if (!spec || !isNumericSet(spec)) return false;
  const adjustments = item ? meta.items?.adjust : meta.adjust;
  return (
    tracksBounds(spec) ||
    Object.values(adjustments ?? {}).some((a) => a?.prop === spec.prop && tracksBounds(a))
  );
}
