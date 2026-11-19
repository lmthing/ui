import { goalLine } from "../../../catalog";

/** A daily goal reading, including its label, actual value, target and unit. */
export function activityRingLine(ring: { label: string; value: number; of: number; unit: string }): string {
  return `${ring.label}: ${ring.value} ${goalLine(ring.of)} ${ring.unit}`;
}
