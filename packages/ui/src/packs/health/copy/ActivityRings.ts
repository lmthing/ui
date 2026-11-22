import { goalLine, numberLine } from "../../../catalog";
import { healthWordsFor } from "../lang";

export const activityScoreMax = 100;
export function activityScoreLine(score: { label: string; value: number }, lang?: string): string {
  return healthWordsFor(lang).activityScore(
    score.label,
    numberLine(score.value, lang),
    goalLine(activityScoreMax, lang),
  );
}

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
