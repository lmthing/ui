import { clip } from "../cast";
import type { Component } from "../types";
import type { FilledFlow, FlowFrame } from "./fill-flow";
import type { FlowState } from "./flow-template";

export type FlowSearch = { query: string; category: string };

export function previewSearch(
  flow: FilledFlow,
  frame: FlowFrame,
  goto: (target: string) => string,
  state: FlowState | undefined,
  { query, category }: FlowSearch = { query: "", category: "" },
): Component[] {
  const { hint, filterLabel, results } = frame.search!;
  const rows = results.map(({ title, detail, category, step }) => ({
    title: clip(String(flow.record[title]), 28),
    meta: clip(String(flow.record[detail]), 36),
    category: clip(String(flow.record[category]), 16),
    goto: goto(`${frame.role}/${step}`),
    trail: "chevron",
  }));
  const options = [...new Set(rows.map((row) => row.category!))];
  if (options.length < 2) throw new Error(`Search needs at least two categories: ${frame.key}`);
  const appliedQuery = query.trim().toLowerCase();
  const matches = rows.filter(
    (row) =>
      (!category || row.category === category) &&
      [row.title, row.meta, row.category].some((value) => value?.toLowerCase().includes(appliedQuery)),
  );
  const controls = {
    id: "filter",
    c: "FilterBar",
    hint: clip(hint, 40),
    filters: [{ label: filterLabel, options, ...(category ? { value: category } : {}) }],
  };
  // Keep the zero-results message adjacent to the still-active controls in the phone preview.
  if (state === "empty" || matches.length === 0)
    return [controls, { id: "no_matches", c: "Note", text: frame.messages.empty }];
  return [controls, { id: "results", c: "List", lead: "none", rows: matches }];
}
