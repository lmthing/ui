type Dose = { name: string; time: string; status: "due" | "taken" | "skipped"; left?: number | undefined };

export const medicationLabels = {
  due: "Due",
  taken: "Taken",
  skipped: "Skipped",
  skip: "Skip",
  success: "All doses taken",
} as const;

export function stockLine(left: number): string {
  return `${left} left`;
}

export function orderedDoses<T extends { time: string }>(doses: readonly T[]): T[] {
  return [...doses].sort((a, b) => a.time.localeCompare(b.time));
}

export function refillLine(doses: readonly Dose[], refillAt?: number): string | undefined {
  if (refillAt === undefined) return undefined;
  const low = orderedDoses(doses).filter((dose) => dose.left !== undefined && dose.left <= refillAt);
  return low.length ? `Refill: ${low.map((dose) => dose.name).join(", ")}` : undefined;
}

export function medicationReading({
  doses,
  refillAt,
}: {
  doses: Dose[];
  refillAt?: number | undefined;
}): string[] {
  const refill = refillLine(doses, refillAt);
  return [
    ...(doses.every((dose) => dose.status === "taken") ? [medicationLabels.success] : []),
    ...orderedDoses(doses).flatMap((dose) => [
      `${dose.name}: ${dose.time} · ${medicationLabels[dose.status]}`,
      ...(dose.status === "due" ? [medicationLabels.taken, medicationLabels.skip] : []),
      ...(dose.left !== undefined ? [stockLine(dose.left)] : []),
    ]),
    ...(refill ? [refill] : []),
  ];
}
