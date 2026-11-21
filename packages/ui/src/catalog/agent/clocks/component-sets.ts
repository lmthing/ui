import type { Meta } from "../../meta";
import type { Values } from "../index";
import { validateActionValue } from "../index";

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

export function effectiveLimits(set: NumericSet, adjustments: Meta["adjust"], props: Values) {
  const related = Object.values(adjustments ?? {}).filter((adjust) => adjust?.prop === set.prop);
  const cap = set.runtime ? props[set.maxProp] : undefined;
  const min = Math.max(set.min ?? -Infinity, ...related.map((adjust) => adjust?.min ?? -Infinity));
  const max = Math.min(
    set.max ?? Infinity,
    !set.runtime ? Infinity : finite(cap) ? cap : -Infinity,
    ...related.map((adjust) => adjust?.max ?? Infinity),
  );
  return {
    ...set,
    min: set.runtime && set.integer ? Math.ceil(min) : min,
    max: set.runtime && set.integer ? Math.floor(max) : max,
  };
}

export function runtimeNumber(spec: ReturnType<typeof effectiveLimits>, saved: unknown) {
  if (!spec.runtime) return;
  const valid = (value: unknown): value is number =>
    finite(value) && value >= spec.min && value <= spec.max && (!spec.integer || Number.isInteger(value));
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
): Values {
  let projected = props;
  for (const set of Object.values(meta.set ?? {})) {
    if (!isRuntimeSet(set)) continue;
    const limits = effectiveLimits(set, meta.adjust, validated);
    const cap = validated[set.maxProp];
    if (cap !== projected[set.maxProp]) projected = { ...projected, [set.maxProp]: cap };
    const value = runtimeNumber(limits, get(keyFor("", set.prop)));
    if (value !== projected[set.prop]) projected = { ...projected, [set.prop]: value };
  }
  return projected;
}
