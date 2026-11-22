import type { Meta } from "../meta";
import { adjustmentAt, numericSetAt } from "./clocks";
import type { Affordance } from "./affordances";
import type { DeviceData } from "./device-data";

type Props = Record<string, unknown>;
export type Adjustment = NonNullable<ReturnType<typeof adjustmentAt>>;
/** Item increments without a numeric setter or a clock are owned by the pure action planner. */
export function isAdjustOnlyItem(
  adjustment: Adjustment | undefined,
  action: string,
): adjustment is Adjustment & { clock: undefined; atSet: undefined } {
  return Boolean(
    (action === "increment" || action === "decrement") &&
    !adjustment?.clock &&
    !adjustment?.atSet &&
    adjustment?.key.includes("/$adjust/"),
  );
}

export function numericOffer(
  meta: Meta,
  props: Props,
  instance: string,
  offer: Affordance,
  get: (part: string) => unknown,
  now: number,
  runtime: unknown,
  data?: DeviceData,
): Affordance[] {
  const { address, action } = offer;
  const target = address === instance ? "root" : address.slice(instance.length + 1);
  if (action === "set") {
    const numeric = numericSetAt(meta, props, target, data);
    if (!numeric) return [offer];
    const { spec } = numeric;
    if ((spec.declared || spec.runtime) && !(spec.min <= spec.max)) return [];
    return [{ ...offer, numeric }];
  }
  const adjustment = adjustmentAt(meta, props, target, action, get, now, data);
  if (
    adjustment &&
    (adjustment.declared || runtime || adjustment.atSet || isAdjustOnlyItem(adjustment, action)) &&
    adjustment.next === undefined
  )
    return [];
  return [adjustment?.declared ? { ...offer, adjustment } : offer];
}
