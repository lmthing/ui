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
  heatDay: (index: number, short?: boolean) => string;
  heatDetail: (style: "weeks" | "hours") => string;
  heatHour: (hour: string, short?: boolean) => string;
  heatLegend: (unit: string) => string;
  heatReading: (label: string, values: readonly string[]) => string;
  heatValue: (day: string, slot: string, value: string, unit: string) => string;
  heatWeek: (week: string, short?: boolean) => string;
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
  heatDay: (index, short) =>
    (short
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])[index]!,
  heatDetail: (style) =>
    style === "weeks" ? "Weeks start on Monday" : "Two-hour blocks · Scroll for later hours",
  heatHour: (hour, short) => (short ? `${hour}h` : `${hour}:00`),
  heatLegend: (unit) => `Intensity scale · ${unit}`,
  heatReading: (label, values) => `${label}: ${values.join(" · ")}`,
  heatValue: (day, slot, value, unit) => `${day}, ${slot}: ${value} ${unit}`,
  heatWeek: (week, short) => (short ? `W${week}` : `Week ${week}`),
  tableColumn: (label, position) => `${position}. ${label}`,
  tableCount: (count, form) => (form === "one" ? `${count} row` : `${count} rows`),
  tablePick: (label) => `Select ${label}`,
  tableSort: "Sort by column",
} satisfies DataWords;
