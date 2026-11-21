import type { ClockState, Meta } from "../../meta";
import type { ActionName } from "../../types";
import { validateActionValue, type DeviceData, type Values } from "../index";
import { clockKey, clockMax, clockPropKey, clockRows as knownRows, clockTargets, clockTime } from "./clock";
import { effectiveLimits, finite, isNumericSet, keyFor, runtimeNumber } from "./component-sets";
import { resolveRange, rowId, snapNumber, type ResolvedRange } from "./numeric";
function nextNumber(current: number, delta: number, min: number, max: number) {
  if (!finite(delta) || min > max) return;
  const next = Math.min(max, Math.max(min, current + delta));
  if (finite(next) && Math.sign(next - current) === Math.sign(delta) && next !== current) return next;
}

function boundedNext(
  current: unknown,
  delta: number,
  bounds: ResolvedRange,
  clock?: ReturnType<typeof clockTargets>[number],
) {
  if (!finite(current)) return;
  const min = Math.max(bounds.min, clock ? 0 : -Infinity);
  const max = Math.min(bounds.max, clock ? clockMax(clock) : Infinity);
  const unsnapped = nextNumber(current, delta, min, max);
  if (unsnapped === undefined) return;
  const next = bounds.step ? snapNumber(unsnapped, min, max, bounds.step) : unsnapped;
  if (
    clock &&
    (clock.spec.kind === "until" || clock.spec.timestamp || clock.spec.journal || !Number.isSafeInteger(next))
  )
    return;
  if (
    Math.sign(next - current) === Math.sign(delta) &&
    !validateActionValue("set", next, { ...bounds, min, max })
  )
    return next;
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
  data?: DeviceData,
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
  const setter =
    !clock && Object.entries(sets ?? {}).find(([, set]) => set.prop === prop && isNumericSet(set));
  const holder = row < 0 ? props : rows[row]!;
  const setLimits =
    setter && isNumericSet(setter[1])
      ? effectiveLimits(meta, setter[1], adjustments, props, holder, data)
      : undefined;
  const bounds = setLimits ?? resolveRange(meta, [spec], holder, props, data);
  const state = clock ? (get(clockKey(clock)) as ClockState | undefined) : undefined;
  const saved = get(key);
  const current = clock
    ? clockTime(clock, state, get(clockPropKey(clock)), now)
    : setLimits?.runtime
      ? runtimeNumber(setLimits, saved)
      : saved === undefined || (setter && row < 0)
        ? holder[prop]
        : saved;
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
    declared: bounds.declared,
    next: boundedNext(current, delta, bounds, clock),
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
