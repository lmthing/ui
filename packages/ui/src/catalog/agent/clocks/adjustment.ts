import type { ClockState, Meta, NumericAdjustments } from "../../meta";
import type { ActionName } from "../../types";
import type { Values } from "../index";
import { clockKey, clockPropKey, clockTargets, clockTime } from "./clock";

const knownRows = (value: unknown) => (Array.isArray(value) ? (value as Values[]) : []);
const rowId = (meta: Meta, row: Values, index: number) =>
  String(row.id ?? `${meta.items?.prefix ?? "r"}${index + 1}`);
const keyFor = (base: string, prop: string) => `${base}$adjust/${prop}`;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function nextNumber(current: number, delta: number, min: number, max: number) {
  if (!finite(delta) || min > max) return;
  const next = Math.min(max, Math.max(min, current + delta));
  if (finite(next) && Math.sign(next - current) === Math.sign(delta) && next !== current) return next;
}

/** Resolve one declared part/action without changing the order or identity of its holder. */
export function adjustmentAt(
  meta: Meta,
  props: Values,
  target: string,
  action: string,
  get: (part: string) => unknown,
  now: number,
) {
  if (!meta.adjust && !meta.items?.adjust) return;
  const rows = knownRows(props[meta.items?.key ?? ""]);
  const [item, part] = target.split("/", 2);
  const row = rows.findIndex((holder, index) => rowId(meta, holder, index) === item);
  const base = row < 0 ? "" : `${item}/`;
  const control = row < 0 ? target : (part ?? "root");
  const spec = (row < 0 ? meta.adjust : meta.items?.adjust)?.[`${control}.${action as ActionName}`];
  if (!spec) return;
  const { prop, delta } = spec;
  const key = keyFor(base, prop);
  const clock = clockTargets(meta, props).find(
    (clock) => clock.base === base && clock.child === undefined && clock.spec.prop === prop,
  );
  const state = clock ? (get(clockKey(clock)) as ClockState | undefined) : undefined;
  const current = clock
    ? clockTime(clock, state, get(clockPropKey(clock)), now)
    : (get(key) ?? (row < 0 ? props : rows[row])?.[prop]);
  const min = Math.max(spec.min ?? -Infinity, clock ? 0 : -Infinity);
  const max = Math.min(spec.max ?? Infinity, clock?.spec.max ?? Infinity);
  const next = finite(current) ? nextNumber(current, delta, min, max) : undefined;
  return {
    key,
    clock,
    state,
    current,
    next: clock && (clock.spec.kind === "until" || !Number.isSafeInteger(next)) ? undefined : next,
  };
}

function projectHolder(
  holder: Values,
  specs: NumericAdjustments | undefined,
  base: string,
  get: (part: string) => unknown,
): Values {
  for (const spec of Object.values(specs ?? {})) {
    if (!spec || !finite(holder[spec.prop])) continue;
    const value = get(keyFor(base, spec.prop));
    if (finite(value) && value !== holder[spec.prop]) holder = { ...holder, [spec.prop]: value };
  }
  return holder;
}

/** Read from the store after parsing so this also works for derived, addressed item rows. */
export function projectAdjustments(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  if (meta.adjust) props = projectHolder(props, meta.adjust, "", get);
  const items = meta.items;
  if (!items?.adjust || !Array.isArray(props[items.key])) return props;
  return {
    ...props,
    [items.key]: knownRows(props[items.key]).map((row, index) =>
      projectHolder(row, items.adjust, `${rowId(meta, row, index)}/`, get),
    ),
  };
}
