import { numberLine, timeOfDayLine } from "../../../catalog";
import { healthWordsFor } from "../lang";

type Dose = { name: string; time: string; status: "due" | "taken" | "skipped"; left?: number | undefined };

export const { medicationLabels } = healthWordsFor();

export function stockLine(left: number, lang?: string): string {
  return healthWordsFor(lang).medicationStock(numberLine(left, lang));
}

export function orderedDoses<T extends { time: string }>(doses: readonly T[]): T[] {
  return [...doses].sort((a, b) => a.time.localeCompare(b.time));
}

export function refillLine(doses: readonly Dose[], refillAt?: number, lang?: string): string | undefined {
  if (refillAt === undefined) return undefined;
  const low = orderedDoses(doses).filter((dose) => dose.left !== undefined && dose.left <= refillAt);
  return low.length ? healthWordsFor(lang).medicationRefill(low.map((dose) => dose.name)) : undefined;
}

export function medicationReading(
  {
    doses,
    refillAt,
  }: {
    doses: Dose[];
    refillAt?: number | undefined;
  },
  lang?: string,
): string[] {
  const { medicationLabels, medicationReading: doseLine } = healthWordsFor(lang);
  const refill = refillLine(doses, refillAt, lang);
  return [
    ...(doses.every((dose) => dose.status === "taken") ? [medicationLabels.success] : []),
    ...orderedDoses(doses).flatMap((dose) => [
      doseLine(dose.name, timeOfDayLine(dose.time, lang), medicationLabels[dose.status]),
      ...(dose.status === "due" ? [medicationLabels.taken, medicationLabels.skip] : []),
      ...(dose.left !== undefined ? [stockLine(dose.left, lang)] : []),
    ]),
    ...(refill ? [refill] : []),
  ];
}
