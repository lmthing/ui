import type { LDMLPluralRule } from "../../../catalog";

const funnelOverall = "Overall conversion";

export type DataWords = {
  activityLabel: (who: string, text: string, time: string, diff?: string) => string;
  activityDiff: (old: string, next: string) => string;
  activityKind: string;
  activityKinds: Record<"all" | "created" | "updated" | "deleted", string>;
  boardCard: (id: string, fields: readonly (string | undefined)[]) => string;
  boardDestination: (destination: string, card: string) => string;
  boardMove: string;
  boardStage: (label: string, count: string, total?: string) => string;
  boardTotal: string;
  boardStages: string;
  boardUnassigned: string;
  bulkSelectAll: string;
  bulkSelected: (count: string) => string;
  chartLatest: string;
  chartGoal: (value: string) => string;
  chartRange: Record<"7d" | "30d" | "90d" | "1y", string>;
  chartPlaceholder: (index: number) => string;
  chartPoints: (title: string) => string;
  chartReading: (id: string, series: string, label: string, value: string) => string;
  chartSelected: (series: string, label: string, value: string) => string;
  chartSeriesPoints: (series: string) => string;
  chartUnit: (unit: string) => string;
  chartValue: (value: string, unit: string) => string;
  funnelConversion: (rate: string) => string;
  funnelFromPrevious: (rate: string) => string;
  funnelOverall: string;
  funnelUnavailable: string;
  heatDay: (index: number, short?: boolean) => string;
  heatDetail: (style: "weeks" | "hours") => string;
  heatHour: (hour: string, short?: boolean) => string;
  heatLegend: (unit: string) => string;
  heatReading: (label: string, values: readonly string[]) => string;
  heatValue: (day: string, slot: string, value: string, unit: string) => string;
  heatWeek: (week: string, short?: boolean) => string;
  savedViews: {
    title: string;
    save: string;
    remove: (label: string) => string;
    success: string;
    removed: string;
    chip: (label: string, count: string) => string;
    matches: (count: string, form: LDMLPluralRule) => string;
    layouts: Record<"table" | "cards" | "board", string>;
  };
  tableColumn: (label: string, position: string) => string;
  tableCount: (count: string, form: LDMLPluralRule) => string;
  tablePick: (label: string) => string;
  tableSort: string;
  tableExport: string;
  tableSummary: Record<"sum" | "avg" | "count", string>;
  tableUnavailable: string;
};

export const en = {
  activityLabel: (who, text, time, diff) => `${who}: ${text} (${time})${diff ? ` · ${diff}` : ""}`,
  activityDiff: (old, next) => `${old} → ${next}`,
  activityKind: "Filter changes by kind",
  activityKinds: { all: "All changes", created: "Created", updated: "Updated", deleted: "Deleted" },
  boardCard: (id, fields) => `${id}: ${fields.filter(Boolean).join(" · ")}`,
  boardDestination: (destination, card) => `Move ${card} to ${destination}`,
  boardMove: "Move to",
  boardStage: (label, count, total) => `${label} (${count}${total ? `, Total ${total}` : ""})`,
  boardTotal: "Total",
  boardStages: "Stages",
  boardUnassigned: "Unassigned",
  bulkSelectAll: "Select all",
  bulkSelected: (count) => `${count} selected`,
  chartLatest: "Latest values",
  chartGoal: (value) => `Goal: ${value}`,
  chartRange: { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", "1y": "Last year" },
  chartPlaceholder: (index) => ["One", "Two", "Three", "Four"][index]!,
  chartPoints: (title) => `${title} data points`,
  chartReading: (id, series, label, value) => `${id} ${series} · ${label} · ${value}`,
  chartSelected: (series, label, value) => `${series} · ${label}: ${value}`,
  chartSeriesPoints: (series) => `${series} data points`,
  chartUnit: (unit) => `Unit: ${unit}`,
  chartValue: (value, unit) => `${value} ${unit}`,
  funnelConversion: (rate) => `${funnelOverall}: ${rate}`,
  funnelFromPrevious: (rate) => `From previous: ${rate}`,
  funnelOverall,
  funnelUnavailable: "Not available",
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
  savedViews: {
    title: "Saved views",
    save: "Save current view",
    remove: (label) => `Remove ${label}`,
    success: "Saved views updated",
    removed: "View removed",
    chip: (label, count) => `${label} · ${count}`,
    matches: (count, form) => (form === "one" ? `${count} match` : `${count} matches`),
    layouts: { table: "Table layout", cards: "Cards layout", board: "Board layout" },
  },
  tableColumn: (label, position) => `${position}. ${label}`,
  tableCount: (count, form) => (form === "one" ? `${count} row` : `${count} rows`),
  tablePick: (label) => `Select ${label}`,
  tableSort: "Sort by column",
  tableExport: "Export table",
  tableSummary: { sum: "Total", avg: "Average", count: "Record count" },
  tableUnavailable: "Not available",
} satisfies DataWords;
