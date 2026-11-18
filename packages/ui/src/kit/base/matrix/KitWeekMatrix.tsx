import type { ReactNode } from "react";
import { KitTable } from "./KitTable";
import { transposeWeek, type Column, type Drawing, type MatrixRow } from "./matrix-layout";

type WeekMatrixProps = Drawing & {
  days: readonly Column[];
  rows: readonly MatrixRow[];
  corner: ReactNode;
  orientation?: "daysAcross" | "daysDown";
  today?: string;
  trailing?: readonly { row: string; content: ReactNode }[];
};

/** A seven-day table. Days-down transposes caller headings and cells without recomputing values. */
export function KitWeekMatrix({ orientation = "daysAcross", today, trailing, ...props }: WeekMatrixProps) {
  if (props.days.length !== 7) throw new Error("KitWeekMatrix requires exactly seven day headers");
  const rows = props.rows.map((row) => ({
    ...row,
    cells: [
      ...row.cells,
      ...(trailing
        ? [{ id: `${row.id}/trailing`, content: trailing.find((entry) => entry.row === row.id)?.content }]
        : []),
    ],
  }));
  const columns = [...props.days, ...(trailing ? [{ id: "trailing", label: "", header: null }] : [])];
  if (orientation === "daysAcross")
    return <KitTable {...props} columns={columns} rows={rows} {...(today ? { activeColumn: today } : {})} />;
  const transposed = transposeWeek(props.days, props.rows);
  return (
    <KitTable
      {...props}
      columns={transposed.columns}
      rows={[
        ...transposed.rows.map((row) => ({ ...row, selected: row.id === today })),
        ...(trailing
          ? [
              {
                id: "trailing",
                label: "",
                heading: null,
                cells: props.rows.map((row) => ({
                  id: `${row.id}/trailing`,
                  content: trailing.find((entry) => entry.row === row.id)?.content,
                })),
              },
            ]
          : []),
      ]}
    />
  );
}
