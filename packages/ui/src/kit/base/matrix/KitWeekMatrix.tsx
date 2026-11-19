import type { ReactNode } from "react";
import { parseAddress } from "../../../catalog";
import { PartContext, usePartContext } from "../../part";
import { KitTable } from "./KitTable";
import {
  MatrixSelectionContext,
  transposeWeek,
  type Column,
  type Drawing,
  type MatrixRow,
} from "./matrix-layout";

type WeekMatrixProps = Drawing & {
  days: readonly Column[];
  rows: readonly MatrixRow[];
  corner: ReactNode;
  orientation?: "daysAcross" | "daysDown";
  /** Fit a small set of days-down columns instead of scrolling them sideways. */
  fitColumns?: boolean;
  today?: string | undefined;
  trailing?: readonly { row: string; content: ReactNode }[];
};

function WeekContent({ item, children }: { item: string; children: ReactNode }) {
  const { item: inherited, ...context } = usePartContext();
  const id = parseAddress(`${context.screen}/${context.component}/${item}/root`)?.item ?? inherited;
  return (
    <PartContext.Provider value={{ ...context, ...(id ? { item: id } : {}) }}>
      {children}
    </PartContext.Provider>
  );
}

function weekRows(days: readonly Column[], rows: readonly MatrixRow[]) {
  return rows.map((row) => ({
    ...row,
    heading: <WeekContent item={row.id}>{row.heading}</WeekContent>,
    cells: days.map((day, index) => {
      const cell = row.cells[index] ?? { id: `${row.id}/${day.id}`, content: null };
      return {
        ...cell,
        content: <WeekContent item={cell.target?.item ?? row.id}>{cell.content}</WeekContent>,
        ...(cell.compactContent === undefined
          ? {}
          : {
              compactContent: (
                <WeekContent item={cell.target?.item ?? row.id}>{cell.compactContent}</WeekContent>
              ),
            }),
      };
    }),
  }));
}

/** A seven-day table. Days-down transposes caller headings and cells without recomputing values. */
export function KitWeekMatrix({
  orientation = "daysAcross",
  fitColumns,
  today,
  trailing,
  ...props
}: WeekMatrixProps) {
  if (props.days.length !== 7) throw new Error("KitWeekMatrix requires exactly seven day headers");
  const totals = Boolean(trailing?.length && props.rows.length);
  const source = weekRows(props.days, props.rows);
  const rows = source.map((row) => ({
    ...row,
    cells: [
      ...row.cells,
      ...(totals
        ? [{ id: `${row.id}/trailing`, content: trailing!.find((entry) => entry.row === row.id)?.content }]
        : []),
    ],
  }));
  const columns = [...props.days, ...(totals ? [{ id: "trailing", label: "", header: null }] : [])];
  if (orientation === "daysAcross")
    return <KitTable {...props} columns={columns} rows={rows} {...(today ? { activeColumn: today } : {})} />;
  const transposed = transposeWeek(props.days, source);
  return (
    <MatrixSelectionContext.Provider value={props.rows.filter((row) => row.selected).map((row) => row.id)}>
      <KitTable
        {...props}
        fitColumns={fitColumns}
        columns={transposed.columns}
        headerTargets={props.rows.flatMap((row) =>
          row.target ? [{ column: row.id, target: row.target }] : [],
        )}
        rows={[
          ...(source.length ? transposed.rows.map((row) => ({ ...row, selected: row.id === today })) : []),
          ...(totals
            ? [
                {
                  id: "trailing",
                  label: "",
                  heading: null,
                  cells: props.rows.map((row) => ({
                    id: `${row.id}/trailing`,
                    content: (
                      <WeekContent item={row.id}>
                        {trailing!.find((entry) => entry.row === row.id)?.content}
                      </WeekContent>
                    ),
                  })),
                },
              ]
            : []),
        ]}
      />
    </MatrixSelectionContext.Provider>
  );
}
