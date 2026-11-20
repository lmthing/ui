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
    const valid = isNumericSet(spec)
      ? typeof value === "number" && Number.isFinite(value)
      : !validateActionValue("set", value, spec);
    if (valid && value !== props[prop]) props = { ...props, [prop]: value };
  }
  return props;
}
