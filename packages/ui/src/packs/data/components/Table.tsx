import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { tableChoices, tableCount, tableReading, tableSummaryModes } from "../copy";
import { dataWordsFor } from "../lang";
import { TableMatrix } from "../option-views";

// Core first: List/rows cannot align typed fields across records or sort by a column.
// prettier-ignore
export const meta = {
  id: "Table",
  status: "ready", group: "data",
  purpose: "Compare and sort many records by several fields, and optionally select rows.",
  pick: "Compare several records across named columns, sort by a column, or tick rows for a batch. Not a short scannable list (List), one record's facts (KeyValue), or league standings (Standings).",
  writeHints: [
    'If asked to hide or omit the row count or footer, set "detail":"brief". Otherwise set detail to null. Always write density null unless a density or spacing change is explicitly requested.',
    'Each row has exactly one cell per column, in the same order. For example, text, number and date columns take cells ["Fern", 4, "2026-11-20"]. text and status take strings up to 24 characters; number and money take numbers; date takes YYYY-MM-DD.',
    "sort is a zero-based column index; omit it when no sort is requested. selectable enables row checkboxes.",
    'For grouped rows use group "sections" (first status column, or the first column if there is no status); otherwise use null. For explicitly tighter rows use density "compact".',
    'Set summaryRow to "sum" or "avg" for numeric and money totals or averages, or "count" for a record count. Set exportable true only when an export button is requested.',
  ],
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "A query over records on the device.",
  variants: { density: ["compact", "comfortable"], detail: ["full", "brief"], group: ["none", "sections"] },
  variantParts: { "detail.brief": { hides: ["count"] }, "group.sections": { adds: ["group_heading"] } },
  parts: ["root", "header", "matrix", "summary", "count", "empty", "export", "export_label", "export_status"],
  items: { key: "rows", parts: ["root", "pick", "group_heading", "status_1", "status_2", "status_3", "status_4", "status_5", "status_6"] },
  states: ["filled", "empty", "loading"],
  partTiers: { export: "service" },
  actions: {
    parts: { header: ["select"], export: ["press"] }, items: { root: ["press"], pick: ["check"] },
    when: { "root.press": { linked: true }, pick: { selectable: true }, export: { exportable: true } },
  },
  hostCommands: { parts: { "export.press": { kind: "command", name: "data.exportTable" } } },
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
    summaryRow: z.enum(tableSummaryModes).optional(), exportable: z.boolean().optional(),
  })
  .superRefine(({ columns, rows, sort, summaryRow }, ctx) => {
    if (sort !== undefined && sort >= columns.length)
      ctx.addIssue({ code: "custom", path: ["sort"], message: "Sort must name an existing column index" });
    if (summaryRow && summaryRow !== "count" && !columns.some(({ kind }) => numericKind(kind)))
      ctx.addIssue({ code: "custom", path: ["summaryRow"], message: "A sum or average requires a numeric or money column" });
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
    sort: 1, selectable: true, density: "compact",
  },
  {
    selectable: false, density: "compact",
    columns: [{ label: "Route", kind: "text" }, { label: "Walks", kind: "number" }, { label: "Takings", kind: "money" }],
    rows: [{ cells: ["Canal loop", 8, 96] }, { cells: ["Hill circuit", 5, 75] }],
  },
  {
    group: "sections", summaryRow: "sum", exportable: true, selectable: true,
    columns: [{ label: "Route", kind: "text" }, { label: "Status", kind: "status" }, { label: "Walks", kind: "number" }],
    rows: [{ cells: ["Canal loop", "Booked", 8] }, { cells: ["Hill circuit", "Open", 5] }, { cells: ["Park loop", "Booked", 3] }],
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
  {
    ...write("Show a table of route names and walk counts: Canal 8, Hill 5. No checkboxes. Make the rows and spacing compact."),
    variant: { axis: "density", value: "compact" },
  },
  {
    ...write("Put Boston fern (Ready), Rubber plant (Review), and Aloe (Ready) in Plant and Status table columns, with no checkboxes. Group the entries into sections under status headings."),
    variant: { axis: "group", value: "sections" },
  },
  {
    ...write("Show routes Canal and Hill with 8 and 5 walks, no checkboxes. Add a footer row that computes the average of the walk counts."),
    expectProps: { summaryRow: "avg" },
  },
  {
    ...write("Show routes Canal and Hill with 8 and 5 walks, no checkboxes. Include the button to export the table."),
    expectProps: { exportable: true },
  },
] satisfies c.Probe[];

type ViewProps = c.Props<typeof props, typeof meta>;
const numericKind = (kind: ViewProps["columns"][number]["kind"]) => kind === "number" || kind === "money";

// prettier-ignore
export function Table(input: ViewProps) {
  const scope = kit.usePartContext();
  const state = kit.useComponentState();
  const { lang, words } = kit.useWords(dataWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const loading = state === "loading", count = tableCount(input.rows.length, lang);
  const status = kit.useHostOperations().find(({ name }) => name === "data.exportTable")?.status;
  const pending = status === "pending";
  const feedback = status && status !== "pending" ? status : undefined;
  const matrix = <TableMatrix {...{ input, density, loading, lang, pending }} />;
  const body = <>
    {loading ? matrix :
      <kit.KitTrack part="header" role="radiogroup" label={words.tableSort}>
        {matrix}
      </kit.KitTrack>}
    {detail === "full" && <kit.KitLayoutText line={{ text: count, role: "caption", tone: "muted", part: "count" }} density={density} />}
    {input.exportable && <kit.KitActionFooter density={density}>
      <kit.KitAction part="export" action="press" label={pending ? words.tableExportPending : words.tableExport} kind="secondary"
        contentParts={{ label: "export_label" }} />
    </kit.KitActionFooter>}
    {input.exportable && !loading && feedback &&
      <kit.PartScope {...scope} state={feedback === "accepted" ? "success" : "error"}>
        <kit.KitState retain part="export_status" message={words.tableExportResult[feedback]} density={density} />
      </kit.PartScope>}
  </>;
  return <kit.KitCard padded density={density}>
    <kit.KitState part="empty" loading={body} density={density}>{body}</kit.KitState>
  </kit.KitCard>;
}
