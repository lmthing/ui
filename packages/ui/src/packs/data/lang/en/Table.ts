import type { DataWords } from "..";

export const words = {
  tableColumn: (label, position) => `${position}. ${label}`,
  tableCount: (count, form) => (form === "one" ? `${count} row` : `${count} rows`),
  tablePick: (label) => `Select ${label}`,
  tableSort: "Sort by column",
  tableExport: "Export table",
  tableExportPending: "Exporting table…",
  tableExportResult: {
    accepted: "Table exported",
    rejected: "Could not export the table",
    cancelled: "Table export cancelled",
  },
  tableSummary: { sum: "Total", avg: "Average", count: "Record count" },
  tableUnavailable: "Not available",
} satisfies Pick<
  DataWords,
  | "tableColumn"
  | "tableCount"
  | "tablePick"
  | "tableSort"
  | "tableExport"
  | "tableExportPending"
  | "tableExportResult"
  | "tableSummary"
  | "tableUnavailable"
>;
