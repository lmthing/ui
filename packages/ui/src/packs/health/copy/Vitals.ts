import { numberLine } from "../../../catalog";
import { healthWordsFor } from "../lang";

type Vital = {
  label: string;
  value: number;
  value2?: number | undefined;
  unit: string;
  low: number;
  high: number;
  at: string;
  context?: keyof ReturnType<typeof healthWordsFor>["vitalLabels"]["context"] | undefined;
};

export const { vitalLabels } = healthWordsFor();

export function vitalPairLine(value: number, lang?: string): string {
  return healthWordsFor(lang).vitalPair(numberLine(value, lang));
}

/** Only the primary value has a supplied reference range, including both endpoints. */
export function vitalBand({ value, low, high }: Pick<Vital, "value" | "low" | "high">) {
  const padding = Math.max(high - low, 1) / 2;
  return {
    min: Math.min(low, value) - padding,
    max: Math.max(high, value) + padding,
    tone: value < low || value > high ? ("warn" as const) : ("text" as const),
  };
}

export function vitalUnitLine({ value2, unit }: Pick<Vital, "value2" | "unit">, lang?: string): string {
  return healthWordsFor(lang).vitalUnit(unit, value2 === undefined ? undefined : numberLine(value2, lang));
}

export function vitalStatusLine(
  reading: Pick<Vital, "value" | "low" | "high" | "value2">,
  lang?: string,
): string {
  const { vitalLabels: words } = healthWordsFor(lang);
  const status = vitalBand(reading).tone === "warn" ? words.outside : words.normal;
  return reading.value2 === undefined ? status : words.systolic(status);
}

export function vitalRangeLine(reading: Pick<Vital, "low" | "high" | "value2">, lang?: string): string {
  const { vitalLabels: words } = healthWordsFor(lang);
  return words.range(
    numberLine(reading.low, lang),
    numberLine(reading.high, lang),
    reading.value2 !== undefined,
  );
}

/** Read exactly the supplied values and reference, never a diagnosis or rounded measurement. */
export function vitalLine(reading: Vital, lang?: string, showTime = true): string {
  return healthWordsFor(lang).vitalReading(
    reading.label,
    numberLine(reading.value, lang),
    vitalUnitLine(reading, lang),
    vitalRangeLine(reading, lang),
    vitalStatusLine(reading, lang),
    showTime ? reading.at : undefined,
    reading.context === undefined ? undefined : healthWordsFor(lang).vitalLabels.context[reading.context],
  );
}
