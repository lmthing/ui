import type { ReactNode } from "react";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { tableCell, tableChoices, tableSections, tableSummary, type tableSummaryModes } from "../copy";
import { dataWordsFor } from "../lang";

type Column = { label: string; kind: Parameters<typeof tableCell>[1] };
type Row = { id: string; cells: (string | number)[]; goto?: string | undefined };
type ViewProps = {
  columns: Column[];
  rows: Row[];
  selectable: boolean;
  sort?: number | undefined;
  sort_options?: ReturnType<typeof tableChoices>;
  group: "none" | "sections";
  summaryRow?: (typeof tableSummaryModes)[number] | undefined;
};

const numericKind = (kind: Column["kind"]) => kind === "number" || kind === "money";
const shortHeading = 8;
// prettier-ignore
function TableCell(cell: Row["cells"][number], { kind }: Column, index: number, density: c.ThemeDensity, loading: boolean, lang: string, part: "root" | null = null) {
  const value = tableCell(cell, kind, lang);
  const numeric = numericKind(kind), align = numeric ? "end" : kind === "status" ? "center" : "start";
  if (loading && kind === "status") return <kit.KitSkeleton lead="none" inset="none" density={density}
    items={[{ lines: [{ text: value, role: "body", align }] }]} />;
  if (loading) {
    const reserve = numeric && value.length < 2 ? value.repeat(3) : value;
    const placeholder = <kit.KitSkeleton shape="figure" inset="none" density={density}
      content={[[numeric ? "number" : "label", reserve, align, "compact"]]} />;
    return numeric ? <kit.KitContent inset="md">{placeholder}</kit.KitContent> : placeholder;
  }
  if (kind === "status")
    return <kit.KitTrail part={`status_${index + 1}`} kind="badge" value={value} tone="text" density={density} />;
  const line = <kit.KitText part={part} role={numeric ? "number" : "body"} numberScale="compact"
    align={align} tabular={numeric || kind === "date"} density={density}>{value}</kit.KitText>;
  return numeric ? <kit.KitContent inset="md">{line}</kit.KitContent> : line;
}

// prettier-ignore
function TableHeading(row: Row, column: Column, { selectable, density, loading, lang }: {selectable: boolean; density: c.ThemeDensity; loading: boolean; lang: string}) {
  const cell = row.cells[0]!, label = tableCell(cell, column.kind, lang);
  const compact = selectable && column.kind === "text" ? "compact" : density;
  if (selectable && loading) return <kit.KitSkeleton lead="box" inset="none" density="compact"
    items={[{ lines: [{ text: label, role: numericKind(column.kind) ? "number" : "body",
      numberScale: "compact", density: compact }] }]} />;
  const wrap = !loading && (row.goto || selectable || column.kind === "status");
  const value = TableCell(cell, column, 0, compact, loading, lang, wrap ? null : "root");
  const content = !selectable && (column.kind === "text" || column.kind === "date")
    ? <kit.KitContent inset="md">{value}</kit.KitContent> : value;
  if (!wrap) return content;
  const link = <kit.KitRow inline inset="none" density={density} part="root" fitContent={!row.goto && !selectable}
    goto={row.goto} label={label}>{content}</kit.KitRow>;
  if (!selectable) return link;
  const pick = <kit.KitCheck part="pick" done={false} label={dataWordsFor(lang).tablePick(label)} />;
  return <kit.KitRow inline density={density} inset="none"
    leadingAlign="row" label={label} leading={pick}>{link}</kit.KitRow>;
}

// prettier-ignore
function TableHeader({ label, value }: { label: string; value: string }, kind: Column["kind"], on: boolean, loading: boolean, pending: boolean, density: c.ThemeDensity) {
  const align = numericKind(kind) ? "end" : kind === "status" ? "center" : "start";
  if (loading) return <kit.KitContent inset="md">
    <kit.KitLayoutText line={{ text: label, role: "meta" }} {...{ align, density }} />
  </kit.KitContent>;
  const chip = <kit.KitChip item={null} look="segment" role="radio" label={label} value={value} on={on} disabled={pending} />;
  if (align === "center") return chip;
  if (align === "end") return <kit.KitGrid fitLast><kit.KitContent>{null}</kit.KitContent>{chip}</kit.KitGrid>;
  return <kit.KitRow inline fitContent part={null} label={label} leadingAlign="row" leading={chip}>{null}</kit.KitRow>;
}

function SectionLabel(label: string, density: c.ThemeDensity) {
  return (
    <kit.KitContent inset="md">
      <kit.KitLayoutText
        density={density}
        line={{ text: label, part: "group_heading", role: "meta", tone: "muted", strong: true }}
      />
    </kit.KitContent>
  );
}

function SectionCell(value: ReactNode, label: string, density: c.ThemeDensity, heading: boolean) {
  return (
    <kit.KitContent density={density}>
      <kit.KitRow inline fitContent part={null} lineRole="label" label={label} density={density}>
        {heading && SectionLabel(label, density)}
      </kit.KitRow>
      <kit.KitRow inline part={null} label={label} density={density}>
        {value}
      </kit.KitRow>
    </kit.KitContent>
  );
}

// prettier-ignore
export function TableMatrix({ input, density, loading, lang, pending }: {
  input: ViewProps; density: c.ThemeDensity; loading: boolean; lang: string; pending: boolean;
}) {
  const { columns, rows, selectable, sort, group, summaryRow } = input;
  const scope = kit.usePartContext();
  const headers = tableChoices(columns, lang).map(({ label, value }) => ({
    id: String(value), label,
    header: TableHeader({ label, value: input.sort_options?.[value]?.label ?? label },
      columns[value]!.kind, value === sort, loading, pending, density),
  }));
  const drawing = tableSections(rows, columns, group, sort, lang).flatMap(({ label, rows }, section) => {
    // A heading that may wrap needs its own measured row; the short slot uses one label line.
    const short = label && label.length <= shortHeading;
    const records = rows.map((row, index) => {
      const decorate = (value: ReactNode, heading = false) =>
        index === 0 && short ? SectionCell(value, label, density, heading) : value;
      return {
        id: row.id, label: tableCell(row.cells[0]!, columns[0]!.kind, lang),
        heading: decorate(TableHeading(row, columns[0]!, { selectable, density, loading, lang }), true),
        cells: columns.slice(1).map((column, i) => ({
          id: headers[i + 1]!.id,
          content: decorate(TableCell(row.cells[i + 1]!, column, i + 1, density, loading, lang)),
        })),
      };
    });
    if (label && !short) records.unshift({
      id: `section_${section}`, label, cells: [],
      heading: <kit.PartScope {...scope} item={rows[0]!.id}>{SectionLabel(label, density)}</kit.PartScope>,
    });
    return records;
  });
  if (summaryRow) {
    const { label, cells } = tableSummary(columns, rows, summaryRow, lang);
    const figure = (text: string | undefined) =>
      <kit.KitContent inset="md"><kit.KitLayoutText line={{ text, role: "figure", compact: true, tabular: true }}
        align="end" density={density} /></kit.KitContent>;
    drawing.push({
      id: "summary", label,
      heading: <kit.PartScope {...scope}><kit.KitContent inset="md"><kit.KitLayoutText density={density}
        line={{ text: label, part: "summary", role: "meta", strong: true }} /></kit.KitContent>
        {figure(cells[0])}</kit.PartScope>,
      cells: cells.slice(1).map((text, i) => ({ id: headers[i + 1]!.id, content: figure(text) })),
    });
  }
  return <kit.KitTable part="matrix" corner={headers[0]!.header} columns={headers.slice(1)}
    rows={drawing} fitColumns={fitTable(input, lang)} />;
}

// prettier-ignore
function fitTable({ columns, rows }: ViewProps, lang: string) {
  return columns.length <= 3 && columns.every(({ label }) => label.length <= shortHeading) &&
    rows.every(({ cells }) => cells.every((cell, at) => tableCell(cell, columns[at]!.kind, lang).length <= 12));
}
