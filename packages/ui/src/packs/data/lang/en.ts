import { words as FunnelWords } from "./en/Funnel";
import { words as SavedViewsWords } from "./en/SavedViews";
import { words as ActivityLogWords } from "./en/ActivityLog";
import { words as BoardWords } from "./en/Board";
import { words as BulkActionsWords } from "./en/BulkActions";
import { words as LineChartWords } from "./en/LineChart";
import { words as HeatmapWords } from "./en/Heatmap";
import { words as TableWords } from "./en/Table";
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
  tableExportPending: string;
  tableExportResult: Record<"accepted" | "rejected" | "cancelled", string>;
  tableSummary: Record<"sum" | "avg" | "count", string>;
  tableUnavailable: string;
};

export const en = {
  ...ActivityLogWords,
  ...BoardWords,
  ...BulkActionsWords,
  ...LineChartWords,
  ...HeatmapWords,
  ...TableWords,
  ...FunnelWords,
  ...SavedViewsWords,
} satisfies DataWords;
