import type { Meta } from "../../meta";
import type { Values } from "../index";
import { isRuntimeSet, keyFor, type NumericSet } from "./component-sets";

export const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

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
