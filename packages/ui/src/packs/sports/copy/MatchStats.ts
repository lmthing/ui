import { numberLine } from "../../../catalog";

export function matchStatValue(value: number, unit: "count" | "percent", lang?: string): string {
  return unit === "percent"
    ? new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 2 }).format(value / 100)
    : numberLine(value, lang);
}
