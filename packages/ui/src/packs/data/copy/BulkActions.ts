import { numberLine } from "../../../catalog";
import { dataWordsFor } from "../lang";

export function bulkSelected(count: number, lang?: string): string {
  return dataWordsFor(lang).bulkSelected(numberLine(count, lang));
}
