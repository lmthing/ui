import { appointmentDate, localeOf, moneyLine, numberLine, pluralForm } from "../../../catalog";
import { dataWordsFor } from "../lang";

type Kind = "text" | "number" | "money" | "date" | "status";
type Column = { label: string; kind: Kind };
type Cell = string | number;
type Row = { id?: string; cells: readonly Cell[] };
export const tableSummaryModes = ["sum", "avg", "count"] as const;
type Summary = (typeof tableSummaryModes)[number];

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

export function tableSections<T extends Row>(
  rows: readonly T[],
  columns: readonly Column[],
  group: "none" | "sections",
  sort?: number,
  lang?: string,
) {
  if (group !== "sections") return [{ label: undefined, rows: tableRows(rows, columns, sort, lang) }];
  const status = columns.findIndex(({ kind }) => kind === "status");
  const index = status < 0 ? 0 : status;
  const groups = new Map<Cell, T[]>();
  for (const row of rows) {
    const cell = row.cells[index]!;
    if (!groups.has(cell)) groups.set(cell, []);
    groups.get(cell)!.push(row);
  }
  return [...groups].map(([cell, rows]) => ({
    label: tableCell(cell, columns[index]!.kind, lang),
    rows: tableRows(rows, columns, sort, lang),
  }));
}

function aggregate(values: readonly number[], average: boolean) {
  const total = compensatedTotal(values);
  if (Number.isFinite(total)) return average ? total / values.length : total;
  // A power-of-two divisor bounds partial sums without rounding the large terms.
  const scale = 2 ** Math.ceil(Math.log2(values.length));
  const sum = compensatedTotal(values.map((value) => value / scale));
  return (average ? sum / values.length : sum) * scale;
}

function compensatedTotal(values: readonly number[]) {
  let sum = 0;
  let correction = 0;
  for (const value of values) {
    const next = sum + value;
    if (!Number.isFinite(next)) return next;
    correction += Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum;
    sum = next;
  }
  return sum + correction;
}

export function tableSummary(columns: readonly Column[], rows: readonly Row[], mode: Summary, lang?: string) {
  const words = dataWordsFor(lang);
  return {
    label: words.tableSummary[mode],
    cells: columns.map(({ kind }, index) => {
      if (mode === "count") return index === 0 ? numberLine(rows.length, lang) : undefined;
      if (kind !== "number" && kind !== "money") return;
      const value = aggregate(
        rows.map(({ cells }) => cells[index] as number),
        mode === "avg",
      );
      return Number.isFinite(value) ? tableCell(value, kind, lang) : words.tableUnavailable;
    }),
  };
}

export function tableReading(
  {
    columns,
    rows,
    sort,
    detail,
    group = "none",
    summaryRow,
    exportable,
  }: {
    columns: readonly Column[];
    rows: readonly Row[];
    sort?: number | undefined;
    detail: "full" | "brief";
    group?: "none" | "sections";
    summaryRow?: Summary | undefined;
    exportable?: boolean | undefined;
  },
  lang?: string,
): string[] {
  const stamped = rows.map((row, index) => ({ ...row, id: row.id ?? `r${index + 1}` }));
  const summary = summaryRow && tableSummary(columns, rows, summaryRow, lang);
  return [
    tableChoices(columns)
      .map(({ label }) => label)
      .join(" · "),
    ...tableSections(stamped, columns, group, sort, lang).flatMap(({ label, rows }) => [
      ...(label === undefined ? [] : [label]),
      ...rows.map(
        ({ id, cells }) =>
          `${id}: ${cells.map((cell, index) => tableCell(cell, columns[index]!.kind, lang)).join(" · ")}`,
      ),
    ]),
    ...(summary
      ? [
          [
            summary.label,
            ...summary.cells.flatMap((cell, index) =>
              cell === undefined ? [] : [summaryRow === "count" ? cell : `${columns[index]!.label}: ${cell}`],
            ),
          ].join(" · "),
        ]
      : []),
    ...(detail === "brief" ? [] : [tableCount(rows.length, lang)]),
    ...(exportable ? [dataWordsFor(lang).tableExport] : []),
  ];
}
