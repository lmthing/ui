import { words as ActivityLogWords } from "./en/ActivityLog";
import { words as BoardWords } from "./en/Board";
import { words as BulkActionsWords } from "./en/BulkActions";
import { words as LineChartWords } from "./en/LineChart";
import { words as HeatmapWords } from "./en/Heatmap";
import { words as TableWords } from "./en/Table";
import type { LDMLPluralRule } from "../../../catalog";

export type DataWords = {
  activityLabel: (who: string, text: string, time: string) => string;
  boardCard: (id: string, fields: readonly (string | undefined)[]) => string;
  boardDestination: (destination: string, card: string) => string;
  boardMove: string;
  boardStage: (label: string, count: string, total?: string) => string;
  boardTotal: string;
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
  ...ActivityLogWords,
  ...BoardWords,
  ...BulkActionsWords,
  ...LineChartWords,
  ...HeatmapWords,
  ...TableWords,
} satisfies DataWords;
