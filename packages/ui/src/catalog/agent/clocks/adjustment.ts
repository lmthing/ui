import type { ClockState, Meta } from "../../meta";
import type { ActionName } from "../../types";
import type { Values } from "../index";
import { clockKey, clockMax, clockPropKey, clockTargets, clockTime } from "./clock";
import { adjustmentKey as keyFor, effectiveLimits, finite, runtimeNumber } from "./numeric-limits";
const knownRows = (value: unknown) => (Array.isArray(value) ? (value as Values[]) : []);
const rowId = (meta: Meta, row: Values, index: number) =>
  String(row.id ?? `${meta.items?.prefix ?? "r"}${index + 1}`);
function nextNumber(current: number, delta: number, min: number, max: number) {
  if (!finite(delta) || min > max) return;
  const next = Math.min(max, Math.max(min, current + delta));
  if (finite(next) && Math.sign(next - current) === Math.sign(delta) && next !== current) return next;
}

export function itemSetAt(meta: Meta, props: Values, target: string) {
  const sets = meta.items?.set;
  if (!sets) return;
  const [id, part = "root", ...rest] = target.split("/");
  if (rest.length || !Object.hasOwn(sets, part)) return;
  const spec = sets[part]!;
  const rows = knownRows(props[meta.items!.key]);
  const holder = rows.find((row, index) => rowId(meta, row, index) === id);
  if (holder)
    return {
      key: keyFor(`${id}/`, spec.prop),
      spec: effectiveLimits(spec, meta.items?.adjust, props),
      value: holder[spec.prop],
    };
}

export function numericSetAt(meta: Meta, props: Values, target: string) {
  const item = itemSetAt(meta, props, target);
  if (item) return item;
  const sets = meta.set;
  if (!sets || !Object.hasOwn(sets, target)) return;
  const spec = effectiveLimits(sets[target]!, meta.adjust, props);
  return { key: keyFor("", spec.prop), spec, value: props[spec.prop] };
}

export function projectComponentSets(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  for (const { prop, runtime } of Object.values(meta.set ?? {})) {
    if (runtime) continue;
    const value = get(keyFor("", prop));
    if (finite(value) && value !== props[prop]) props = { ...props, [prop]: value };
  }
  return props;
}

/** Used only after the controller has resumed a confirmed component press. */
export function clearItemSets(meta: Meta, props: Values, target: string): Values {
  if (target.includes("/") || !meta.confirmParts?.includes(target)) return {};
  const items = meta.items;
  const clear = meta.clearItems;
  if (!items?.set || !clear || !Object.hasOwn(clear, target)) return {};
  const part = clear[target]!;
  if (!Object.hasOwn(items.set, part)) return {};
  const { prop } = items.set[part]!;
  return Object.fromEntries(
    knownRows(props[items.key]).flatMap((row, index) => {
      const id = rowId(meta, row, index);
      const address = part === "root" ? id : `${id}/${part}`;
      return [
        [keyFor(`${id}/`, prop), null],
        [address, null],
      ];
    }),
  );
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
  const adjustments = row < 0 ? meta.adjust : meta.items?.adjust;
  const spec = adjustments?.[`${control}.${action as ActionName}`];
  if (!spec) return;
  const { prop, delta } = spec;
  const key = keyFor(base, prop);
  const clock = clockTargets(meta, props).find(
    (clock) => clock.base === base && clock.child === undefined && clock.spec.prop === prop,
  );
  const sets = row < 0 ? meta.set : meta.items?.set;
  const setter = !clock && Object.entries(sets ?? {}).find(([, set]) => set.prop === prop);
  const bounds = setter ? effectiveLimits(setter[1], adjustments, props) : undefined;
  const state = clock ? (get(clockKey(clock)) as ClockState | undefined) : undefined;
  const saved = get(key);
  const current = clock
    ? clockTime(clock, state, get(clockPropKey(clock)), now)
    : bounds?.runtime
      ? runtimeNumber(bounds, saved)
      : saved === undefined || (setter && row < 0)
        ? (row < 0 ? props : rows[row])?.[prop]
        : saved;
  const min = Math.max(spec.min ?? -Infinity, bounds?.min ?? -Infinity, clock ? 0 : -Infinity);
  const max = Math.min(spec.max ?? Infinity, bounds?.max ?? Infinity, clock ? clockMax(clock) : Infinity);
  const next = finite(current) ? nextNumber(current, delta, min, max) : undefined;
  const atSet =
    setter && (action === "increment" || action === "decrement")
      ? row >= 0 && setter[0] === "root"
        ? item
        : `${base}${setter[0]}`
      : undefined;
  return {
    key,
    clock,
    state,
    current,
    atSet,
    next:
      (clock && (clock.spec.kind === "until" || !Number.isSafeInteger(next))) ||
      (bounds?.integer && !Number.isInteger(next))
        ? undefined
        : next,
  };
}

function projectHolder(
  holder: Values,
  specs: readonly ({ prop: string } | undefined)[],
  base: string,
  get: (part: string) => unknown,
): Values {
  for (const spec of specs) {
    if (!spec || !finite(holder[spec.prop])) continue;
    const value = get(keyFor(base, spec.prop));
    if (finite(value) && value !== holder[spec.prop]) holder = { ...holder, [spec.prop]: value };
  }
  return holder;
}

function projectItemSets(meta: Meta, row: Values, base: string, get: (part: string) => unknown): Values {
  for (const { prop } of Object.values(meta.items?.set ?? {})) {
    const value = get(keyFor(base, prop));
    if ((value === null || finite(value)) && value !== row[prop]) row = { ...row, [prop]: value };
  }
  return row;
}

export function projectMatrix(
  meta: Meta,
  props: Values,
  get: (part: string) => unknown,
  defaultValues: (rows: string, values: string) => unknown,
): Values {
  const items = meta.items!;
  const cells = knownRows(props[items.key]);
  for (const { prop, matrix } of Object.values(items.set ?? {})) {
    if (!matrix || !Array.isArray(props[matrix.rows])) continue;
    let index = 0;
    const rows = knownRows(props[matrix.rows]).map((row) => {
      const values = row[matrix.values] ?? defaultValues(matrix.rows, matrix.values);
      if (!Array.isArray(values)) return row;
      const next = values.map((seed: unknown) => {
        const id = rowId(meta, cells[index] ?? {}, index++);
        const value = get(keyFor(`${id}/`, prop));
        return value === null || finite(value) ? value : seed;
      });
      return next.some((value, at) => value !== values[at]) ? { ...row, [matrix.values]: next } : row;
    });
    props = { ...props, [matrix.rows]: rows };
  }
  return props;
}

/** Read from the store after parsing so this also works for derived, addressed item rows. */
export function projectAdjustments(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  const setters = new Set(Object.values(meta.set ?? {}).map(({ prop }) => prop));
  const top = Object.values(meta.adjust ?? {}).filter((spec) => spec && !setters.has(spec.prop));
  if (top.length) props = projectHolder(props, top, "", get);
  const items = meta.items;
  if (!items?.adjust && !items?.set) return props;
  if (!Array.isArray(props[items.key])) return props;
  const specs = Object.values(items.adjust ?? {});
  return {
    ...props,
    [items.key]: knownRows(props[items.key]).map((row, index) => {
      const base = `${rowId(meta, row, index)}/`;
      return projectItemSets(meta, projectHolder(row, specs, base, get), base, get);
    }),
  };
}
