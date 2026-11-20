import type { Meta } from "../../meta";
import type { Values } from "../index";

type SetSpec = NonNullable<Meta["set"]>[string];
export const adjustmentKey = (base: string, prop: string) => `${base}$adjust/${prop}`;
export const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function effectiveLimits(set: SetSpec, adjustments: Meta["adjust"], props: Values) {
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

export function projectRuntimeSets(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  let projected = props;
  for (const set of Object.values(meta.set ?? {})) {
    if (!set.runtime) continue;
    const limits = effectiveLimits(set, meta.adjust, props);
    const value = runtimeNumber(limits, get(adjustmentKey("", set.prop)));
    if (value !== projected[set.prop]) projected = { ...projected, [set.prop]: value };
  }
  return projected;
}
