import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { tableCell, tableChoices, tableCount, tableReading, tableRows } from "../copy";
import { dataWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Table.generated";

// Core first: List/rows cannot align typed fields across records or sort by a column.
// prettier-ignore
export const meta = {
  id: "Table",
  status: "ready", group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "A query over records on the device.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["count"] } },
  parts: ["root", "header", "matrix", "count", "empty"],
  items: { key: "rows", parts: ["root", "pick", "status_1", "status_2", "status_3", "status_4", "status_5", "status_6"] },
  states: ["filled", "empty", "loading"],
  actions: {
    parts: { header: ["select"] }, items: { root: ["press"], pick: ["check"] },
    when: { "root.press": { linked: true }, pick: { selectable: true } },
  },
  live: { checks: { pick: "checked" } },
  select: { prop: "sort", choices: { header: { prop: "sort_options" } } },
  read: (input, state, lang): string[] => (state === "filled" ? tableReading(input as ViewProps, lang) : []),
} as const satisfies c.Meta;

// prettier-ignore
const column = z.strictObject({ label: c.text(14), kind: z.enum(["text", "number", "money", "date", "status"]) });
const isoDate = z.iso.date();
// prettier-ignore
const row = z.strictObject({ cells: z.array(z.union([c.text(24), z.number()])).min(2).max(6), goto: c.screenId.optional() });
// prettier-ignore
export const props = z.strictObject({
    ...c.variantProps(meta.variants),
    columns: z.array(column).min(2).max(6), rows: z.array(row).min(1).max(20),
    sort: z.int().min(0).max(5).optional(), selectable: z.boolean(),
  })
  .superRefine(({ columns, rows, sort }, ctx) => {
    if (sort !== undefined && sort >= columns.length)
      ctx.addIssue({ code: "custom", path: ["sort"], message: "Sort must name an existing column index" });
    rows.forEach(({ cells }, r) => {
      if (cells.length !== columns.length)
        ctx.addIssue({ code: "custom", path: ["rows", r, "cells"], message: "Write one cell per column" });
      columns.forEach(({ kind }, c) => {
        const cell = cells[c];
        const valid =
          kind === "number" || kind === "money"
            ? typeof cell === "number"
            : kind === "date"
              ? isoDate.safeParse(cell).success
              : typeof cell === "string";
        if (!valid)
          ctx.addIssue({ code: "custom", path: ["rows", r, "cells", c], message: `Expected ${kind} cell` });
      });
    });
  })
  .overwrite((input) => ({
    ...input,
    sort_options: tableChoices(input.columns),
    rows: input.rows.map((row) => ({ ...row, linked: Boolean(row.goto), checked: false })),
  }));

// prettier-ignore
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const detail = c.wordsFor(lang).placeholderDetail, thing = c.thingOf(cast);
  const rows = c.itemsOf(cast, 20, thing?.type).map((item, index) => ({
    cells: [c.titleOf(item, 24, thing) ?? c.placeholderTitle(index, lang), c.detailOf(item, 24, thing) ?? detail],
  }));
  return {
    columns: [0, 1].map((i) => ({ label: c.placeholderTitle(i, lang), kind: "text" })),
    rows: rows.length ? rows : [{ cells: [c.placeholderTitle(0, lang), detail] }],
    selectable: false,
  };
}

// prettier-ignore
export const examples = [
  {
    columns: [{ label: "Plant", kind: "text" }, { label: "Tag", kind: "status" }, { label: "Pots", kind: "number" }],
    rows: [{ cells: ["Boston fern", "Good", 3], goto: "fern" }, { cells: ["Rubber fig", "Check", 2], goto: "rubber" }],
    sort: 1, selectable: true,
  },
  {
    selectable: false,
    columns: [{ label: "Route", kind: "text" }, { label: "Walks", kind: "number" }, { label: "Takings", kind: "money" }],
    rows: [{ cells: ["Canal loop", 8, 96] }, { cells: ["Hill circuit", 5, 75] }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Table");
// prettier-ignore
export const probes = [
  choose("Compare 15 register records in sortable columns for code, quantity, cost and status, with a checkbox on each row."),
  choose("Show a short vertical list of plants with a name and one note on each row, no shared columns or sorting.", "List"),
  write("Show one selectable row for Boston fern, watered on 2026-11-20, health Thriving. Name the columns Plant, Watered, Health; sort by Watered."),
  {
    ...write("Compare Boston fern and Rubber plant in Plant and Watered columns, with their dates 2026-11-20 and 2026-11-18. Keep both rows and columns but leave out the row count below them. No checkboxes."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Tick the checkbox beside Boston fern.", { address: "s1/r1/pick", action: "check" }),
] satisfies c.Probe[];

type ViewProps = c.Props<typeof props, typeof meta>;
const numericKind = (kind: Column["kind"]) => kind === "number" || kind === "money";
type Row = ViewProps["rows"][number];
type Column = ViewProps["columns"][number];
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
function TableHeading(row: Row, column: Column, { selectable, density, loading, lang }: {selectable: boolean; density: c.ThemeDensity; loading: boolean; lang: string}) {
  const cell = row.cells[0]!, label = tableCell(cell, column.kind, lang), inline = density === "compact";
  if (selectable && loading) return <kit.KitSkeleton lead="box" inset="none" density={density} items={[{ title: label }]} />;
  const wrap = !loading && (row.goto || selectable || !inline || column.kind === "status");
  const value = TableCell(cell, column, 0, density, loading, lang, wrap ? null : "root");
  if (!wrap) return !loading && column.kind === "text" ? <kit.KitContent inset="md">{value}</kit.KitContent> : value;
  const link = <kit.KitRow inline={selectable || inline} inset="none" density={density} part="root"
    goto={row.goto} label={label}>{value}</kit.KitRow>;
  if (!selectable) return link;
  const pick = <kit.KitCheck part="pick" done={false} label={dataWordsFor(lang).tablePick(label)} />;
  return <kit.KitRow {...{ inline, density }} inset="none" leadingAlign="row" label={label} leading={pick}>{link}</kit.KitRow>;
}

// prettier-ignore
function TableHeader(label: string, kind: Column["kind"], on: boolean, density: c.ThemeDensity, loading: boolean) {
  const align = numericKind(kind) ? "end" : kind === "status" ? "center" : "start";
  if (loading) return <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", label, align]]} />;
  const chip = <kit.KitChip item={null} look="segment" role="radio" label={label} on={on} />;
  if (align === "center") return chip;
  if (align === "end") return <kit.KitGrid fitLast><kit.KitContent>{null}</kit.KitContent>{chip}</kit.KitGrid>;
  return <kit.KitRow inline label={label} leadingAlign="row" leading={chip}>{null}</kit.KitRow>;
}
// prettier-ignore
function TableMatrix({ input, density, loading, lang }: {
  input: ViewProps; density: c.ThemeDensity; loading: boolean; lang: string;
}) {
  const { columns, rows, selectable, sort } = input;
  const headers = tableChoices(columns).map(({ label, value }) => ({
    id: String(value), label,
    header: TableHeader(label, columns[value]!.kind, value === sort, density, loading),
  }));
  const drawing = tableRows(rows, columns, sort, lang).map((row) => {
    return {
      id: row.id, label: tableCell(row.cells[0]!, columns[0]!.kind, lang),
      heading: TableHeading(row, columns[0]!, { selectable, density, loading, lang }),
      cells: columns.slice(1).map((column, i) => ({
        id: headers[i + 1]!.id, content: TableCell(row.cells[i + 1]!, column, i + 1, density, loading, lang),
      })),
    };
  });
  return <kit.KitTable part="matrix" corner={headers[0]!.header} columns={headers.slice(1)}
    rows={drawing} fitColumns={fitTable(input, lang)} />;
}

// prettier-ignore
function fitTable({ columns, rows }: ViewProps, lang: string) {
  return columns.length <= 3 && columns.every(({ label }) => label.length <= 8) &&
    rows.every(({ cells }) => cells.every((cell, at) => tableCell(cell, columns[at]!.kind, lang).length <= 12));
}

// prettier-ignore
export function Table(input: ViewProps) {
  const state = kit.useComponentState();
  const { lang, words } = kit.useWords(dataWordsFor);
  const density = kit.useKit().density;
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const loading = state === "loading", count = tableCount(input.rows.length, lang);
  if (state === "empty")
    return <kit.KitCard padded density={density}><kit.KitEmpty part="empty" decorativeIcon /></kit.KitCard>;
  return <kit.KitCard padded density={density}>
    {loading ? <TableMatrix {...{ input, density, loading, lang }} /> :
      <kit.KitTrack part="header" role="radiogroup" label={words.tableSort}>
        <TableMatrix {...{ input, density, loading, lang }} />
      </kit.KitTrack>}
    {detail === "full" && (loading ?
      <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["caption", count]]} /> :
      <kit.KitText role="caption" tone="muted" part="count" density={density}>{count}</kit.KitText>)}
  </kit.KitCard>;
}
