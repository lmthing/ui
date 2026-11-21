import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { Values } from "../index";

type Part = NonNullable<NonNullable<Meta["items"]>["nested"]>["parts"][string];
type Step = Extract<Part, { action: "increment" | "decrement" }>;
export const isNestedStep = (spec: Part): spec is Step =>
  spec.action === "increment" || spec.action === "decrement";

/** Use the same normalized options and defaults for wire writes as for offers. */
export function nestedChoiceSeed(def: Definition, input: Values) {
  if (Object.values(def.meta.items?.nested?.parts ?? {}).some(({ action }) => action === "select"))
    return def.props.safeParse(input).data as Values | undefined;
}

export function hasNestedCollectionControls(meta: Meta) {
  const nested = meta.items?.nested;
  return Boolean(
    nested &&
    (nested.groups ||
      Object.values(nested.parts).some(({ action }) => action === "select" || action === "press")),
  );
}

export function hasWireNestedControls(meta: Meta) {
  const nested = meta.items?.nested;
  return (
    nested &&
    (meta.select ||
      meta.set ||
      nested.groups ||
      Object.values(nested.parts).some((part) => isNestedStep(part) || part.action === "select"))
  );
}
export const nestedStepKey = (id: string, index: number, prop: string) => `${id}/$nested/${index}/${prop}`;

export function nestedStepAt(spec: Part, item: Values, id: string, index: number) {
  if (!isNestedStep(spec)) return;
  const key = nestedStepKey(id, index, spec.prop);
  const number = (value: number | string) => (typeof value === "string" ? item[value] : value);
  const min = number(spec.min);
  const max = number(spec.max);
  const step = number(spec.step);
  const current = item[spec.prop];
  const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
  if (!finite(min) || !finite(max) || !finite(step) || !finite(current) || step <= 0 || min > max)
    return { key, next: undefined };
  const direction = spec.action === "increment" ? 1 : -1;
  const next = Math.min(max, Math.max(min, current + direction * step));
  return { key, next: Math.sign(next - current) === direction ? next : undefined };
}
