type Vital = {
  label: string;
  value: number;
  value2?: number | undefined;
  unit: string;
  low: number;
  high: number;
  at: string;
};

export const vitalLabels = { add: "Add reading" } as const;

/** Only the primary value has a supplied reference range, including both endpoints. */
export function vitalBand({ value, low, high }: Pick<Vital, "value" | "low" | "high">) {
  const padding = Math.max(high - low, 1) / 2;
  return {
    min: Math.min(low, value) - padding,
    max: Math.max(high, value) + padding,
    tone: value < low || value > high ? ("warn" as const) : ("text" as const),
  };
}

export function vitalUnitLine({ value2, unit }: Pick<Vital, "value2" | "unit">): string {
  return value2 === undefined ? unit : `/ ${value2} ${unit}`;
}

export function vitalRangeLine(reading: Pick<Vital, "value" | "low" | "high">): string {
  const status = vitalBand(reading).tone === "warn" ? "Outside range" : "In range";
  return `Reference ${reading.low}–${reading.high} · ${status}`;
}

/** Read exactly the supplied values and reference, never a diagnosis or rounded measurement. */
export function vitalLine(reading: Vital): string {
  return `${reading.label}: ${reading.value} ${vitalUnitLine(reading)} · ${vitalRangeLine(reading)} · ${reading.at}`;
}
