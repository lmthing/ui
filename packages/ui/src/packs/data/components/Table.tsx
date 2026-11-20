import { z } from "zod";
import {
  detailOf,
  isoDate,
  itemsOf,
  moneyLine,
  numberLine,
  placeholderDetail,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: List/rows cannot align typed fields across records or sort by a column.
export const meta = {
  id: "Table",
  status: "draft",
  group: "data",
  purpose: "Compare and sort many records by several fields, and optionally select rows.",
  pick: "Compare several records across named columns, sort by a column, or tick rows for a batch. Not a short scannable list (List), one record's facts (KeyValue), or league standings (Standings).",
  writeHints: [
    'Each row has exactly one cell per column, in the same order. For example, text, number and date columns take cells ["Fern", 4, "2026-11-20"]. text and status take strings up to 24 characters; number and money take numbers; date takes YYYY-MM-DD.',
    "sort is a zero-based column index; omit it when no sort is requested. selectable enables row checkboxes.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A query over records on the device.",
  variants: { density: ["compact", "comfortable"] },
  parts: ["root", "header", "count"],
  items: { key: "rows", parts: ["root", "pick"] },
  states: ["filled", "empty", "loading"],
  actions: {
    parts: { header: ["select"] },
    items: { root: ["press"], pick: ["check"] },
    when: { pick: { selectable: true } },
  },
  live: {
    derive: (input): Record<string, unknown> => ({
      sort_options: (input.columns as z.output<typeof props>["columns"]).map(({ label }, value) => ({
        value,
        label,
      })),
    }),
  },
  select: { prop: "sort", choices: { header: { prop: "sort_options" } } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { columns, rows } = input as z.output<typeof props>;
    return [
      columns.map(({ label }) => label).join(" · "),
      ...rows.map(
        ({ cells }, i) =>
          `r${i + 1}: ${cells
            .map((cell, c) =>
              typeof cell === "string"
                ? cell
                : columns[c]?.kind === "money"
                  ? moneyLine(cell, undefined, undefined, lang)
                  : numberLine(cell, lang),
            )
            .join(" · ")}`,
      ),
    ];
  },
} as const satisfies Meta;

const column = z.strictObject({
  label: text(14),
  kind: z.enum(["text", "number", "money", "date", "status"]),
});
const row = z.strictObject({
  cells: z
    .array(z.union([text(24), z.number()]))
    .min(2)
    .max(6),
  goto: screenId.optional(),
});
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    columns: z.array(column).min(2).max(6),
    rows: z.array(row).min(1).max(20),
    sort: z.int().min(0).max(5).optional(),
    selectable: z.boolean(),
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
  });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const rows = itemsOf(cast, 20, thing?.type).map((item, index) => ({
    cells: [
      titleOf(item, 24, thing) ?? placeholderTitle(index, lang),
      detailOf(item, 24, thing) ?? placeholderDetail,
    ],
  }));
  return {
    columns: [0, 1].map((i) => ({ label: placeholderTitle(i, lang), kind: "text" })),
    rows: rows.length ? rows : [{ cells: [placeholderTitle(0, lang), placeholderDetail] }],
    selectable: false,
  };
}

export const examples = [
  {
    columns: [
      { label: "Plant", kind: "text" },
      { label: "Watered", kind: "date" },
      { label: "Health", kind: "status" },
    ],
    rows: [
      { cells: ["Boston fern", "2026-11-20", "Thriving"], goto: "fern" },
      { cells: ["Rubber plant", "2026-11-18", "Needs a check"], goto: "rubber" },
    ],
    sort: 1,
    selectable: true,
  },
  {
    density: "comfortable",
    columns: [
      { label: "Route", kind: "text" },
      { label: "Walks", kind: "number" },
      { label: "Takings", kind: "money" },
    ],
    rows: [{ cells: ["Canal loop", 8, 96] }, { cells: ["Hill circuit", 5, 75] }],
    selectable: false,
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Table");
export const probes = [
  choose(
    "Compare 15 register records in sortable columns for code, quantity, cost and status, with a checkbox on each row.",
  ),
  choose(
    "Show a short vertical list of plants with a name and one note on each row, no shared columns or sorting.",
    "List",
  ),
  write(
    "Show one selectable row for Boston fern, watered on 2026-11-20, health Thriving. Name the columns Plant, Watered, Health; sort by Watered.",
  ),
  read("Tick the checkbox beside Boston fern.", { address: "s1/r1/pick", action: "check" }),
] satisfies Probe[];
