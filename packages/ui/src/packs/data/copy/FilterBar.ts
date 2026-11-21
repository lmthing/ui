import { numberLine, pluralForm } from "../../../catalog";
import { dataWordsFor } from "../lang";

type Filter = { id?: string; label: string; options: readonly string[]; value?: string | undefined };

export function filterCount(filters: readonly Filter[], lang?: string) {
  const count = filters.filter(({ value }) => value !== undefined).length;
  return dataWordsFor(lang).filterCount(numberLine(count, lang), pluralForm(count, lang));
}

export function filterReading(
  {
    filters,
    detail,
    sort,
  }: { filters: readonly Filter[]; detail: "full" | "brief"; sort?: string | undefined },
  lang?: string,
) {
  const words = dataWordsFor(lang);
  return [
    ...(detail === "brief" ? [] : [filterCount(filters, lang)]),
    ...(sort === undefined ? [] : [words.filterSort(sort)]),
    words.filterClear,
    ...filters.map(({ id, label, options, value }, i) =>
      words.filterOptions(id ?? `r${i + 1}`, label, options, value),
    ),
  ];
}
