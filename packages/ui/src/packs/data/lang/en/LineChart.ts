import type { DataWords } from "..";

export const words = {
  chartLatest: "Latest values",
  chartPlaceholder: (index) => ["One", "Two", "Three", "Four"][index]!,
  chartPoints: (title) => `${title} data points`,
  chartReading: (id, series, label, value) => `${id} ${series} · ${label} · ${value}`,
  chartSelected: (series, label, value) => `${series} · ${label}: ${value}`,
  chartSeriesPoints: (series) => `${series} data points`,
  chartUnit: (unit) => `Unit: ${unit}`,
  chartValue: (value, unit) => `${value} ${unit}`,
  chartGoal: (value) => `Goal: ${value}`,
  chartRange: { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", "1y": "Last year" },
} satisfies Pick<
  DataWords,
  | "chartLatest"
  | "chartPlaceholder"
  | "chartPoints"
  | "chartReading"
  | "chartSelected"
  | "chartSeriesPoints"
  | "chartUnit"
  | "chartValue"
  | "chartGoal"
  | "chartRange"
>;
