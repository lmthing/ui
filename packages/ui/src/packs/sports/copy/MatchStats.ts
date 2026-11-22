import { numberLine } from "../../../catalog";

export function matchStatValue(value: number, unit: "count" | "percent", lang?: string): string {
  return unit === "percent"
    ? new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 2 }).format(value / 100)
    : numberLine(value, lang);
}

/** Normalizing first keeps the pair finite even when its raw sum would overflow. */
export function mirroredShares(home: number, away: number): [number, number] {
  const max = Math.max(home, away);
  if (max === 0) return [0, 0];
  const total = home / max + away / max;
  return [home / max / total, away / max / total];
}
