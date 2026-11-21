import { describe, shown, textRects, type FrameCheck, type TextBox } from "./shared";

const number = /^[+\-−(]?\s*\p{Sc}?\s*\d(?:[\d.,'\u2019\s]*\d)?\s*(?:[%‰]|\p{Sc})?\)?$/u;
const tables = "table, [role=table], [role=grid]";
const cells = "td, [role=cell], [role=gridcell]";
type Figure = { el: Element; rect: DOMRect };

function figure(el: Element): Figure | undefined {
  if (!number.test(el.textContent?.trim() ?? "") || !shown(el)) return;
  const [rect, ...rest] = textRects(el);
  if (rect && !rest.length) return { el, rect };
}

function reportColumn({ frame, add }: FrameCheck, title: string, values: Figure[]) {
  if (values.length < 2) return;
  const sorted = values.sort((a, b) => a.rect.right - b.rect.right);
  const first = sorted[0]!;
  const last = sorted.at(-1)!;
  const offset = last.rect.right - first.rect.right;
  if (offset > 2)
    add(
      "numeric-align",
      frame,
      first.el,
      `${title}: ${describe(first.el)} and ${describe(last.el)} differ by ${Math.round(offset)}px at the right edge`,
    );
}

function semanticColumns(context: FrameCheck, figures: Figure[]) {
  const byTable = new Map<Element, Map<number, Figure[]>>();
  for (const value of figures) {
    const cell = value.el.closest(cells);
    const row = cell?.closest("tr, [role=row]");
    const table = row?.closest(tables);
    if (!cell || !row || !table) continue;
    const index = cell.hasAttribute("aria-colindex")
      ? Number(cell.getAttribute("aria-colindex"))
      : Array.from(row.querySelectorAll(`${cells}, th, [role=columnheader], [role=rowheader]`)).indexOf(
          cell,
        ) + 1;
    if (index < 1) continue;
    const columns = byTable.get(table) ?? new Map<number, Figure[]>();
    const values = columns.get(index) ?? [];
    values.push(value);
    columns.set(index, values);
    byTable.set(table, columns);
  }
  for (const columns of byTable.values())
    for (const [index, values] of columns) reportColumn(context, `numeric column ${index}`, values);
}

function timesheetColumns(context: FrameCheck, figures: Figure[], parts: ReadonlyMap<string, Element>) {
  // KitTable draws columns as stacks. Daily figures aren't individually addressed, but each
  // person's addressed total and overtime share the column that contains their tabular figures.
  const matrix = parts.get("matrix");
  if (!matrix) return;
  for (const [part, total] of parts) {
    const item = part.match(/^(r\d+)\/total$/)?.[1];
    if (!item) continue;
    const overtime = parts.get(`${item}/overtime`);
    if (!overtime) continue;
    let column = total.parentElement;
    while (column && column !== matrix && !column.contains(overtime)) column = column.parentElement;
    if (!column || column === matrix || !matrix.contains(column)) continue;
    const values = figures.filter(
      ({ el }) => column.contains(el) && getComputedStyle(el).fontVariantNumeric.includes("tabular-nums"),
    );
    reportColumn(context, `${item} numeric column`, values);
  }
}

export function checkNumericColumns(
  context: FrameCheck,
  texts: TextBox[],
  parts: ReadonlyMap<string, Element>,
) {
  const figures = texts.flatMap(({ el }) => figure(el) ?? []);
  semanticColumns(context, figures);
  if (context.frame.startsWith("timesheet_")) timesheetColumns(context, figures, parts);
}
