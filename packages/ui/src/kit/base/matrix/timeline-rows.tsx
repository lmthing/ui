import { useContext } from "react";
import { XStack, YStack } from "tamagui";
import { component } from "../../../catalog";
import {
  MatrixSelectionContext,
  scrollColumnWidth,
  type Column,
  type MatrixRow,
  type useMatrixHeights,
} from "./matrix-layout";
import { ScopedCell } from "./table-cell";
import { timelineLayout } from "./timeline-layout";

type TimelineProps = {
  rows: readonly MatrixRow[];
  columns: readonly Column[];
  heights: ReturnType<typeof useMatrixHeights>;
  activeColumn?: string;
  loading?: boolean;
  separators?: readonly string[];
};

function timelineCells(row: MatrixRow, count: number) {
  return timelineLayout(row.cells, count).flatMap((slot) =>
    slot.cell
      ? [slot]
      : Array.from({ length: slot.span }, (_, at) => ({ ...slot, start: slot.start + at, span: 1 })),
  );
}

export function TimelineRows(props: TimelineProps) {
  const { rows, columns, heights, activeColumn, loading, separators } = props;
  const selected = useContext(MatrixSelectionContext);
  return rows.map((row) => (
    <XStack key={row.id}>
      {timelineCells(row, columns.length).map(({ cell, start, span }) => {
        const active = columns
          .slice(start, start + span)
          .some(({ id }) => id === activeColumn || selected.includes(id));
        return (
          <YStack
            key={cell ? `cell:${cell.id}` : `gap:${start}`}
            width={scrollColumnWidth * span}
            flexShrink={component.base.none}
          >
            <ScopedCell
              item={cell?.id ?? row.id}
              label={cell?.label ?? `${row.label}, ${columns[start]!.label}`}
              target={cell?.target}
              disabled={cell?.disabled}
              loading={Boolean(loading)}
              selected={row.selected || active}
              height={heights.height(row.id)}
              measure={heights.measure(row.id, `span:${start}`)}
              cut={separators?.includes(row.id)}
            >
              {cell?.content}
            </ScopedCell>
          </YStack>
        );
      })}
    </XStack>
  ));
}
