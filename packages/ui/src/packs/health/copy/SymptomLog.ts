import { numberLine } from "../../../catalog";
import { healthWordsFor } from "../lang";

export type SymptomSeed = { label: string; severity: number; on?: boolean | undefined };

export function symptomChosen(symptom: SymptomSeed): boolean {
  return symptom.on ?? symptom.severity > 0;
}

export function symptomSeverity(symptom: SymptomSeed): number {
  return symptomChosen(symptom) ? Math.max(1, symptom.severity) : 0;
}

export function symptomSeverityLine(symptom: SymptomSeed, lang?: string): string {
  return healthWordsFor(lang).symptomSeverity(symptom.label, symptomLevelLine(symptom, lang));
}

export function symptomLevelLine(symptom: SymptomSeed, lang?: string): string {
  return healthWordsFor(lang).symptomLevel(numberLine(symptomSeverity(symptom), lang), numberLine(5, lang));
}

export function symptomReading(
  groups: readonly { label: string; symptoms: readonly SymptomSeed[] }[],
  lang?: string,
) {
  return groups.flatMap((group) =>
    group.symptoms.filter(symptomChosen).map((symptom) => symptomSeverityLine(symptom, lang)),
  );
}

export function symptomTargets(groups: readonly { label: string; symptoms: readonly SymptomSeed[] }[]) {
  return groups.map(
    (group) => `${group.label}: ${group.symptoms.map((symptom) => symptom.label).join(", ")}`,
  );
}
