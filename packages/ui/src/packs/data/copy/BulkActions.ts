import { numberLine, type BoundSelection } from "../../../catalog";
import { dataWordsFor } from "../lang";

export function bulkSelected(count: number, lang?: string): string {
  return dataWordsFor(lang).bulkSelected(numberLine(count, lang));
}

export function bulkReading(selection: BoundSelection | undefined, lang?: string): string[] {
  if (!selection?.selected.length) return [];
  return [
    bulkSelected(selection.selected.length, lang),
    ...(selection.canSelectAll ? [dataWordsFor(lang).bulkSelectAll] : []),
  ];
}
