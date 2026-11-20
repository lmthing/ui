import type { LDMLPluralRule } from "../../../catalog";

export type DataWords = {
  activityLabel: (who: string, text: string, time: string) => string;
  bulkSelectAll: string;
  bulkSelected: (count: string) => string;
  chartLatest: string;
  chartPlaceholder: (index: number) => string;
  chartPoints: (title: string) => string;
  chartReading: (id: string, series: string, label: string, value: string) => string;
  chartSelected: (series: string, label: string, value: string) => string;
  chartSeriesPoints: (series: string) => string;
  chartUnit: (unit: string) => string;
  chartValue: (value: string, unit: string) => string;
  tableColumn: (label: string, position: string) => string;
  tableCount: (count: string, form: LDMLPluralRule) => string;
  tablePick: (label: string) => string;
  tableSort: string;
};

export const en = {
  activityLabel: (who, text, time) => `${who}: ${text} (${time})`,
  bulkSelectAll: "Select all",
  bulkSelected: (count) => `${count} selected`,
  chartLatest: "Latest values",
  chartPlaceholder: (index) => ["One", "Two", "Three", "Four"][index]!,
  chartPoints: (title) => `${title} data points`,
  chartReading: (id, series, label, value) => `${id} ${series} · ${label} · ${value}`,
  chartSelected: (series, label, value) => `${series} · ${label}: ${value}`,
  chartSeriesPoints: (series) => `${series} data points`,
  chartUnit: (unit) => `Unit: ${unit}`,
  chartValue: (value, unit) => `${value} ${unit}`,
  tableColumn: (label, position) => `${position}. ${label}`,
  tableCount: (count, form) => (form === "one" ? `${count} row` : `${count} rows`),
  tablePick: (label) => `Select ${label}`,
  tableSort: "Sort by column",
} satisfies DataWords;
