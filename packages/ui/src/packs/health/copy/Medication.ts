import { z } from "zod";
import { defineLocalState, numberLine, timeOfDayLine } from "../../../catalog";
import { healthWordsFor } from "../lang";

export const medicationStatus = z.enum(["due", "taken", "skipped"]);
type Dose = {
  name: string;
  time: string;
  dose: string;
  status: z.infer<typeof medicationStatus>;
  left?: number | undefined;
};
type DoseSeed = Pick<Dose, "name" | "time" | "dose" | "status"> & { id: string };
const logSeed = z
  .array(
    z.strictObject({
      id: z.string().max(64),
      name: z.string().max(24),
      dose: z.string().max(16),
      time: z.string().length(5),
      status: medicationStatus,
    }),
  )
  .min(1)
  .max(8);

export const medicationLog = defineLocalState({
  schema: logSeed,
  initial: ({ doses }) =>
    (doses as DoseSeed[]).map(({ id, name, dose, time, status }) => ({
      id,
      name,
      dose,
      time,
      status,
    })),
  itemEvents: ["taken.check", "skip.press"],
  reduce: (rows, event) => {
    if (!rows.some(({ id, status }) => id === event.item && status === "due") || event.value === false)
      return { error: medicationLabels.unavailable };
    return {
      state: rows.map((row) =>
        row.id === event.item ? { ...row, status: event.part === "taken" ? "taken" : "skipped" } : row,
      ),
    };
  },
  project: (rows) => ({ $doseStatuses: Object.fromEntries(rows.map(({ id, status }) => [id, status])) }),
});

export function projectMedication(input: Record<string, unknown>) {
  const statuses = input.$doseStatuses as Record<string, Dose["status"]> | undefined;
  if (!statuses) return {};
  return {
    doses: (input.doses as (Dose & { id: string })[]).map((row) => ({
      ...row,
      status: statuses[row.id] ?? row.status,
    })),
  };
}

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

export function medicationFeedback(doses: readonly Dose[], state: string) {
  const complete = doses.every((dose) => dose.status === "taken");
  const unavailable = state === "error" || (state === "success" && !complete);
  return { complete, unavailable };
}

export function medicationReading(
  {
    doses,
    refillAt,
    detail = "full",
  }: {
    doses: Dose[];
    refillAt?: number | undefined;
    detail?: "full" | "brief";
  },
  lang?: string,
  state = "filled",
): string[] {
  const { medicationLabels, medicationReading: doseLine } = healthWordsFor(lang);
  if (state === "empty") return [medicationLabels.empty];
  const refill = refillLine(doses, refillAt, lang);
  const { complete, unavailable } = medicationFeedback(doses, state);
  return [
    ...(unavailable ? [medicationLabels.unavailable] : []),
    ...orderedDoses(doses).flatMap((dose) => [
      doseLine(
        dose.name,
        timeOfDayLine(dose.time, lang),
        dose.dose,
        medicationLabels[unavailable && dose.status === "due" ? "notLogged" : dose.status],
      ),
      ...(state === "filled" && dose.status === "due"
        ? [medicationLabels.markTaken, medicationLabels.skip]
        : []),
      ...(detail === "full" && dose.left !== undefined ? [stockLine(dose.left, lang)] : []),
    ]),
    ...(complete && !unavailable ? [medicationLabels.success] : []),
    ...(refill ? [refill] : []),
  ];
}
