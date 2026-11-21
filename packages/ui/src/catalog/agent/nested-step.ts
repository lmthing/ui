import type { Meta } from "../meta";
import type { Values } from "./act";

type Part = NonNullable<NonNullable<Meta["items"]>["nested"]>["parts"][string];
export const isNestedStep = (spec: Part) => spec.action === "increment" || spec.action === "decrement";
export function hasWireNestedControls(meta: Meta) {
  const nested = meta.items?.nested;
  return nested && (meta.select || meta.set || Object.values(nested.parts).some(isNestedStep));
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
