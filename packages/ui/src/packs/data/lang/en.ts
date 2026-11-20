import type { LDMLPluralRule } from "../../../catalog";

export type DataWords = {
  tableColumn: (label: string, position: string) => string;
  tableCount: (count: string, form: LDMLPluralRule) => string;
  tablePick: (label: string) => string;
  tableSort: string;
};

export const en = {
  tableColumn: (label, position) => `${position}. ${label}`,
  tableCount: (count, form) => (form === "one" ? `${count} row` : `${count} rows`),
  tablePick: (label) => `Select ${label}`,
  tableSort: "Sort by column",
} satisfies DataWords;
