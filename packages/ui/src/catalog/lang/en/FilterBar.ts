import type { LDMLPluralRule } from "../plural";

export const words = {
  filterClear: "Clear filters",
  filterCount: (count: string, form: LDMLPluralRule) =>
    form === "one" ? `${count} active filter` : `${count} active filters`,
  filterLabel: "Name",
  filterList: "Filter fields",
  filterOptions: (id: string, label: string, options: readonly string[], value?: string) =>
    `${id} ${value === undefined ? label : `${label}: ${value}`} (${options.join(" · ")})`,
  filterSort: (label: string) => `Sort: ${label}`,
};
