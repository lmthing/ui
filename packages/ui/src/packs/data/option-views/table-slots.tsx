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
  group: "none" | "sections";
  summaryRow?: (typeof tableSummaryModes)[number] | undefined;
};

const numericKind = (kind: Column["kind"]) => kind === "number" || kind === "money";
// prettier-ignore
function TableCell(cell: Row["cells"][number], { kind }: Column, index: number, density: c.ThemeDensity, loading: boolean, lang: string, part: "root" | null = null) {
  const value = tableCell(cell, kind, lang);
  const numeric = numericKind(kind), align = numeric ? "end" : kind === "status" ? "center" : "start";
  if (loading && kind === "status") return <kit.KitSkeleton lead="none" inset="none" density={density}
    items={[{ lines: [{ text: value, role: "body", align }] }]} />;
  if (loading) return <kit.KitSkeleton shape="figure" inset="none" density={density}
    content={[[numeric ? "number" : "label", value, align, "compact"]]} />;
  if (kind === "status")
    return <kit.KitTrail part={`status_${index + 1}`} kind="badge" value={value} tone="text" density={density} />;
  const line = <kit.KitText part={part} role={numeric ? "number" : "body"} numberScale="compact"
    align={align} tabular={numeric || kind === "date"} density={density}>{value}</kit.KitText>;
  return numeric ? <kit.KitContent inset="md">{line}</kit.KitContent> : line;
}

// prettier-ignore
function TableHeading(row: Row, column: Column, { selectable, density, loading, lang, grouped }: {selectable: boolean; density: c.ThemeDensity; loading: boolean; lang: string; grouped: boolean}) {
  const cell = row.cells[0]!, label = tableCell(cell, column.kind, lang), inline = density === "compact";
  if (selectable && loading) return <kit.KitSkeleton lead="box" inset="none" density={density} items={[{ title: label }]} />;
  const wrap = !loading && (row.goto || selectable || !inline || column.kind === "status");
  const value = TableCell(cell, column, 0, density, loading, lang, wrap ? null : "root");
  if (!wrap) return !loading && column.kind === "text" ? <kit.KitContent inset="md">{value}</kit.KitContent> : value;
  const link = <kit.KitRow inline={selectable || inline} inset="none" density={density} part="root"
    goto={row.goto} label={label}>{value}</kit.KitRow>;
  if (!selectable) return link;
  const pick = <kit.KitCheck part="pick" done={false} label={dataWordsFor(lang).tablePick(label)} />;
  return <kit.KitRow inline={inline || grouped} density={density} inset="none"
    leadingAlign="row" label={label} leading={pick}>{link}</kit.KitRow>;
}

// prettier-ignore
function TableHeader(label: string, kind: Column["kind"], on: boolean, density: c.ThemeDensity, loading: boolean, pending: boolean) {
  const align = numericKind(kind) ? "end" : kind === "status" ? "center" : "start";
  if (loading) return <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", label, align]]} />;
  const chip = <kit.KitChip item={null} look="segment" role="radio" label={label} on={on} disabled={pending || undefined} />;
  if (align === "center") return chip;
  if (align === "end") return <kit.KitGrid fitLast><kit.KitContent>{null}</kit.KitContent>{chip}</kit.KitGrid>;
  return <kit.KitRow inline label={label} leadingAlign="row" leading={chip}>{null}</kit.KitRow>;
}
// prettier-ignore
export function TableMatrix({ input, density, loading, lang, pending }: {
  input: ViewProps; density: c.ThemeDensity; loading: boolean; lang: string; pending: boolean;
}) {
  const { columns, rows, selectable, sort, group, summaryRow } = input;
  const scope = kit.usePartContext();
  const headers = tableChoices(columns).map(({ label, value }) => ({
    id: String(value), label,
    header: TableHeader(label, columns[value]!.kind, value === sort, density, loading, pending),
  }));
  const separators: string[] = [];
  const drawing = tableSections(rows, columns, group, sort, lang).flatMap(({ label, rows }, section, all) => {
    if (section < all.length - 1 || summaryRow) separators.push(rows.at(-1)!.id);
    return rows.map((row, index) => ({
      id: row.id, label: tableCell(row.cells[0]!, columns[0]!.kind, lang),
      heading: <>{index === 0 && label && <kit.KitMetaLine density={density}
        title={{ text: label, part: "group_heading", role: "meta", strong: true }} />}
        {TableHeading(row, columns[0]!, { selectable, density, loading, lang, grouped: group === "sections" })}</>,
      cells: columns.slice(1).map((column, i) => ({
        id: headers[i + 1]!.id, content: TableCell(row.cells[i + 1]!, column, i + 1, density, loading, lang),
      })),
    }));
  });
  if (summaryRow) {
    const { label, cells } = tableSummary(columns, rows, summaryRow, lang);
    const figure = (text: string | undefined) =>
      <kit.KitLayoutText line={{ text, role: "figure", compact: true, tabular: true }} align="end" density={density} />;
    drawing.push({
      id: "summary", label,
      heading: <kit.PartScope {...scope}><kit.KitMetaLine density={density}
        title={{ text: label, part: "summary", role: "meta", strong: true }} />{figure(cells[0])}</kit.PartScope>,
      cells: cells.slice(1).map((text, i) => ({ id: headers[i + 1]!.id, content: figure(text) })),
    });
  }
  return <kit.KitTable part="matrix" corner={headers[0]!.header} columns={headers.slice(1)}
    rows={drawing} fitColumns={fitTable(input, lang)} separators={separators} />;
}

// prettier-ignore
function fitTable({ columns, rows }: ViewProps, lang: string) {
  return columns.length <= 3 && columns.every(({ label }) => label.length <= 8) &&
    rows.every(({ cells }) => cells.every((cell, at) => tableCell(cell, columns[at]!.kind, lang).length <= 12));
}
