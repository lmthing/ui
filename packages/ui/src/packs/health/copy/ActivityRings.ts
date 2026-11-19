import { goalLine, numberLine } from "../../../catalog";

/** A daily goal reading, including its label, actual value, target and unit. */
export function activityRingLine(
  ring: { label: string; value: number; of: number; unit: string },
  lang?: string,
): string {
  return `${ring.label}: ${numberLine(ring.value, lang)} ${goalLine(ring.of, lang)} ${ring.unit}`;
}
