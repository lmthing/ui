export type SymptomSeed = { label: string; severity: number; on?: boolean | undefined };

export function symptomChosen(symptom: SymptomSeed): boolean {
  return symptom.on ?? symptom.severity > 0;
}

export function symptomSeverity(symptom: SymptomSeed): number {
  return symptomChosen(symptom) ? Math.max(1, symptom.severity) : 0;
}

export function symptomSeverityLine(symptom: SymptomSeed): string {
  return `${symptom.label} · ${symptomLevelLine(symptom)}`;
}

export function symptomLevelLine(symptom: SymptomSeed): string {
  return `${symptomSeverity(symptom)}/5`;
}

export function symptomReading(groups: readonly { label: string; symptoms: readonly SymptomSeed[] }[]) {
  return groups.flatMap((group) => group.symptoms.filter(symptomChosen).map(symptomSeverityLine));
}
