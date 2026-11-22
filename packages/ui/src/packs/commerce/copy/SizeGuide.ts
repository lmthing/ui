import { numberLine } from "../../../catalog";
import { commerceWordsFor } from "../lang";

type Unit = "cm" | "in";
type Measurements = {
  unit: Unit;
  displayUnit?: Unit;
  columns: string[];
  rows: { size: string; values: number[] }[];
  at?: number | undefined;
  fitScore?: number | undefined;
  modelNote?: string | undefined;
  detail: "full" | "brief";
  style: "table" | "fit";
};

const centimetresPerInch = 2.54;

export function measurementLine(value: number, from: Unit, to: Unit, lang?: string): string {
  if (from === to) return numberLine(value, lang);
  const converted = to === "cm" ? value * centimetresPerInch : value / centimetresPerInch;
  return numberLine(Number(converted.toFixed(2)), lang);
}

export function fitLine(score: number, lang?: string): string {
  return commerceWordsFor(lang).sizeGuide.fitWords[score < 2.5 ? 0 : score > 3.5 ? 2 : 1];
}

export function sizeGuideReading(input: Measurements, lang?: string): string[] {
  const { sizeGuide, receiptSeparator } = commerceWordsFor(lang);
  const unit = input.displayUnit ?? input.unit;
  const selected = input.at === undefined ? undefined : input.rows[input.at];
  const measurements = [
    [sizeGuide.unit, sizeGuide.units[unit], ...input.columns].join(receiptSeparator),
    ...input.rows.map(({ size, values }) =>
      [size, ...values.map((value) => measurementLine(value, input.unit, unit, lang))].join(receiptSeparator),
    ),
    ...(selected ? [sizeGuide.reference(selected.size)] : []),
  ];
  const fit = [
    ...(input.fitScore === undefined ? [] : [fitLine(input.fitScore, lang)]),
    ...(input.detail !== "brief" && input.modelNote ? [input.modelNote] : []),
  ];
  return input.style === "fit" ? [...fit, ...measurements] : [...measurements, ...fit];
}
