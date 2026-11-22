import type { Meta } from "../../meta";
import type { Values } from "../index";
import { validateActionValue } from "../index";
import type { DeviceData } from "../device-data";
import { resolveRange } from "./numeric";

type SetSpec = NonNullable<Meta["set"]>[string];
export type NumericSet = Extract<SetSpec, { type?: "number" }>;

export const keyFor = (base: string, prop: string) => `${base}$adjust/${prop}`;
export const isNumericSet = (spec: SetSpec): spec is NumericSet =>
  spec.type === undefined || spec.type === "number";
export const isRuntimeSet = (spec: SetSpec | undefined): spec is Extract<NumericSet, { runtime: true }> =>
  spec !== undefined && isNumericSet(spec) && spec.runtime === true;
export const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function componentSetAt(meta: Meta, props: Values, target: string) {
  const sets = meta.set;
  if (!sets || !Object.hasOwn(sets, target)) return;
  const spec = sets[target]!;
  return { key: keyFor("", spec.prop), spec, value: props[spec.prop] };
}

export function projectComponentSets(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  for (const spec of Object.values(meta.set ?? {})) {
    if (isRuntimeSet(spec)) continue;
    const { prop } = spec;
    const value = get(keyFor("", prop));
    const valid = isNumericSet(spec) ? finite(value) : !validateActionValue("set", value, spec);
    if (valid && value !== props[prop]) props = { ...props, [prop]: value };
  }
  return props;
}

export function effectiveLimits(
  meta: Meta,
  set: NumericSet,
  adjustments: Meta["adjust"],
  props: Values,
  holder = props,
  data?: DeviceData,
) {
  const related = Object.values(adjustments ?? {}).filter(
    (adjust): adjust is NonNullable<typeof adjust> => adjust !== undefined && adjust.prop === set.prop,
  );
  const range = resolveRange(meta, [set, ...related], holder, props, data);
  const { min } = range;
  const cap = set.runtime && set.maxProp !== undefined ? props[set.maxProp] : Infinity;
  const max = Math.min(range.max, cap === Infinity || finite(cap) ? cap : -Infinity);
  const whole = set.integer && (set.runtime || range.declared);
  return {
    ...set,
    ...range,
    min: whole && !range.step ? Math.ceil(min) : min,
    max: whole ? Math.floor(max) : max,
  };
}

export function runtimeNumber(spec: ReturnType<typeof effectiveLimits>, saved: unknown) {
  if (!spec.runtime) return;
  const valid = (value: unknown): value is number => !validateActionValue("set", value, spec);
  if (valid(saved)) return saved;
  if (valid(spec.initial)) return spec.initial;
}

export const hasRuntimeSets = (meta: Meta) => Object.values(meta.set ?? {}).some(isRuntimeSet);

/** Keep runtime destinations and their parsed cap authoritative across live projections. */
export function projectRuntimeSets(
  meta: Meta,
  props: Values,
  get: (part: string) => unknown,
  validated: Values,
  data?: DeviceData,
): Values {
  let projected = props;
  for (const set of Object.values(meta.set ?? {})) {
    if (!isRuntimeSet(set)) continue;
    if (set.maxProp !== undefined && validated[set.maxProp] !== projected[set.maxProp])
      projected = { ...projected, [set.maxProp]: validated[set.maxProp] };
    const limits = effectiveLimits(meta, set, meta.adjust, projected, projected, data);
    const value = runtimeNumber(limits, get(keyFor("", set.prop)));
    if (value !== projected[set.prop]) projected = { ...projected, [set.prop]: value };
  }
  return projected;
}
