import type { DataWords } from "..";

export const words = {
  tableColumn: (label, position) => `${position}. ${label}`,
  tableCount: (count, form) => (form === "one" ? `${count} row` : `${count} rows`),
  tablePick: (label) => `Select ${label}`,
  tableSort: "Sort by column",
} satisfies Pick<DataWords, "tableColumn" | "tableCount" | "tablePick" | "tableSort">;
