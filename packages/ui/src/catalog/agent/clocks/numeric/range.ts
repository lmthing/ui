import type { Meta, NumericLimits, NumericRange } from "../../../meta";
import { selectDeviceData, type DeviceData } from "../../device-data";
import type { Values } from "../../index";

export type ResolvedRange = { min: number; max: number; step?: number; declared?: true };
const closed = { min: Infinity, max: -Infinity, declared: true } as const;
export const tracksBounds = (range?: NumericRange) =>
  range?.bounds !== undefined || range?.step !== undefined;

export function resolveRange(
  meta: Meta,
  specs: readonly NumericRange[],
  holder: Values,
  props: Values,
  data?: DeviceData,
): ResolvedRange {
  let min = -Infinity,
    max = Infinity,
    step: number | undefined,
    declared: true | undefined;
  for (const spec of specs) {
    if (tracksBounds(spec)) declared = true;
    const live = spec.bounds?.(holder, props, selectDeviceData(meta, data));
    if (spec.bounds && !live) return closed;
    for (const range of live ? [spec, live] : [spec]) {
      if (range.min !== undefined) min = Math.max(min, range.min);
      if (range.max !== undefined) max = Math.min(max, range.max);
      if (range.step !== undefined) {
        if (!Number.isFinite(range.step) || range.step <= 0 || (step !== undefined && step !== range.step))
          return closed;
        step = range.step;
      }
    }
  }
  if (!(min <= max) || min === Infinity || max === -Infinity) return declared ? closed : { min, max };
  return { min, max, ...(step === undefined ? {} : { step }), ...(declared ? { declared } : {}) };
}

export const stepOrigin = (min: number | undefined) => (Number.isFinite(min) ? min! : 0);

function indexOf(value: number, min: number | undefined, step: number) {
  return (value - stepOrigin(min)) / step;
}

export function onNumberStep(value: number, min: number | undefined, step: number) {
  const index = indexOf(value, min, step);
  const error = Math.abs(index - Math.round(index));
  return (
    Number.isSafeInteger(Math.round(index)) &&
    error <= Math.min(1e-7, Number.EPSILON * 8 * Math.max(1, Math.abs(index), Math.abs(value / step)))
  );
}

export function numericError(
  value: unknown,
  { min, max, step, integer }: NumericLimits & { integer?: boolean },
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "set takes a finite number";
  if (integer && !Number.isInteger(value)) return "set takes an integer";
  if (min !== undefined && value < min) return `set takes ${min} or more`;
  if (max !== undefined && value > max) return `set takes ${max} or less`;
  if (step !== undefined && !onNumberStep(value, min, step))
    return `Use steps of ${step} from ${stepOrigin(min)}`;
}

/** Kit edits snap to the same lattice that detached set validation checks. */
export function snapNumber(value: number, min: number, max: number, step: number) {
  const upper = indexOf(max, min, step);
  const last = onNumberStep(max, min, step) ? Math.round(upper) : Math.floor(upper);
  const index = Math.min(
    last,
    Math.max(Number.isFinite(min) ? 0 : -Infinity, Math.round(indexOf(value, min, step))),
  );
  const snapped = Number((stepOrigin(min) + index * step).toPrecision(15));
  return Math.min(max, Math.max(min, snapped));
}
