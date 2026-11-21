import { appointmentDate, localeOf, moneyLine, numberLine, pluralForm } from "../../../catalog";
import { dataWordsFor } from "../lang";

type Kind = "text" | "number" | "money" | "date" | "status";
type Column = { label: string; kind: Kind };
type Cell = string | number;
type Row = { id?: string; cells: readonly Cell[] };

export function tableChoices(columns: readonly Column[]) {
  const repeated = new Set(columns.map(({ label }) => label)).size !== columns.length;
  return columns.map(({ label }, value) => ({
    value,
    label: repeated ? dataWordsFor().tableColumn(label, numberLine(value + 1)) : label,
  }));
}

export function tableCell(cell: Cell, kind: Kind, lang?: string): string {
  if (typeof cell === "number")
    return kind === "money" ? moneyLine(cell, undefined, undefined, lang) : numberLine(cell, lang);
  return kind === "date" ? appointmentDate(cell, lang) : cell;
}

export function tableRows<T extends Row>(
  rows: readonly T[],
  columns: readonly Column[],
  sort?: number,
  lang?: string,
): readonly T[] {
  if (sort === undefined) return rows;
  const compare = new Intl.Collator(localeOf(lang), { numeric: true });
  return [...rows].sort((a, b) => {
    const first = a.cells[sort]!,
      second = b.cells[sort]!;
    if (typeof first === "number" && typeof second === "number")
      return first < second ? -1 : first > second ? 1 : 0;
    if (columns[sort]?.kind === "date") return first < second ? -1 : first > second ? 1 : 0;
    return compare.compare(String(first), String(second));
  });
}

export function tableCount(count: number, lang?: string) {
  return dataWordsFor(lang).tableCount(numberLine(count, lang), pluralForm(count, lang));
}

export function tableReading(
  {
    columns,
    rows,
    sort,
    detail,
  }: {
    columns: readonly Column[];
    rows: readonly Row[];
    sort?: number | undefined;
    detail: "full" | "brief";
  },
  lang?: string,
): string[] {
  const stamped = rows.map((row, index) => ({ ...row, id: row.id ?? `r${index + 1}` }));
  return [
    tableChoices(columns)
      .map(({ label }) => label)
      .join(" · "),
    ...tableRows(stamped, columns, sort, lang).map(
      ({ id, cells }) =>
        `${id}: ${cells.map((cell, index) => tableCell(cell, columns[index]!.kind, lang)).join(" · ")}`,
    ),
    ...(detail === "brief" ? [] : [tableCount(rows.length, lang)]),
  ];
}
