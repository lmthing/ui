import { goalLine, numberLine } from "../../../catalog";
import { healthWordsFor } from "../lang";

/** A daily goal reading, including its label, actual value, target and unit. */
export function activityRingLine(
  ring: { label: string; value: number; of: number; unit: string },
  lang?: string,
  showTarget = true,
): string {
  return healthWordsFor(lang).activityRing(
    ring.label,
    numberLine(ring.value, lang),
    showTarget ? goalLine(ring.of, lang) : undefined,
    ring.unit,
  );
}
