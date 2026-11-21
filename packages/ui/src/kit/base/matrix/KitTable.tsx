import { useContext, useRef, type ReactNode } from "react";
import { XStack, YStack, type TamaguiElement } from "tamagui";
import { component, space } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { MatrixScroll } from "./matrix-scroll";
import { ScopedCell } from "./table-cell";
import {
  matrixColumnLayout,
  MatrixSelectionContext,
  scrollColumnWidth,
  useCompactMatrix,
  useMatrixHeights,
  type Column,
  type Drawing,
  type MatrixRow,
  type Target,
} from "./matrix-layout";
import { TimelineRows } from "./timeline-rows";

type TableProps = Drawing & {
  columns: readonly Column[];
  rows: readonly MatrixRow[];
  corner: ReactNode;
  stickyFirst?: boolean;
  fitColumns?: boolean | undefined;
  activeColumn?: string;
  headerTargets?: readonly { column: string; target: Target }[];
  separators?: readonly string[];
  timeline?: { jump?: { part: string; column: string } };
};
function TableColumn({
  column,
  index,
  props,
  heights,
  compact,
  anchor,
}: {
  column?: Column;
  index: number;
  props: TableProps;
  heights: ReturnType<typeof useMatrixHeights>;
  compact: boolean;
  anchor?: React.RefObject<TamaguiElement | null> | undefined;
}) {
  const heading = !column,
    loading = Boolean(props.loading);
  const selected = useContext(MatrixSelectionContext);
  const active = Boolean(column && (column.id === props.activeColumn || selected.includes(column.id)));
  const fit = props.fitColumns ? { fit: true, rail: heading, divider: compact && index > 0 } : {};
  return (
    <YStack {...matrixColumnLayout(Boolean(props.fitColumns), heading)}>
      <ScopedCell
        loading={loading}
        anchor={anchor}
        {...fit}
        label={column?.label ?? ""}
        height={heights.height("header")}
        measure={heights.measure("header", column?.id ?? "corner")}
        target={props.headerTargets?.find((entry) => entry.column === column?.id)?.target}
        selected={active}
      >
        {heading ? props.corner : column.header}
      </ScopedCell>
      {(!props.timeline || heading) &&
        props.rows.map((row) => {
          const cell = row.cells[index];
          return (
            <ScopedCell
              key={row.id}
              item={row.id}
              loading={loading}
              {...fit}
              label={heading ? row.label : `${row.label}, ${column.label}`}
              height={heights.height(row.id)}
              measure={heights.measure(row.id, column?.id ?? "heading")}
              target={heading ? row.target : cell?.target}
              disabled={cell?.disabled && !heading}
              selected={row.selected || active}
              cut={props.separators?.includes(row.id)}
            >
              {heading ? row.heading : compact ? (cell?.compactContent ?? cell?.content) : cell?.content}
            </ScopedCell>
          );
        })}
    </YStack>
  );
}

export function KitTable({ part = "root", stickyFirst = true, ...props }: TableProps) {
  const ks = useKitStyle();
  const heights = useMatrixHeights(space[ks.density.rowPad]);
  const fitColumns = !props.timeline && Boolean(props.fitColumns);
  const { compact, onLayout } = useCompactMatrix(fitColumns);
  const root = { ...usePart(part), onLayout, "aria-busy": Boolean(props.loading) };
  const layout = { props: { ...props, fitColumns }, heights, compact };
  const heading = <TableColumn index={-1} {...layout} />;
  const pinned = stickyFirst || fitColumns;
  const anchor = useRef<TamaguiElement>(null);
  const jump = props.timeline?.jump;
  const index = props.columns.findIndex((column) => column.id === jump?.column);
  const destination =
    jump && index >= 0 && !props.loading
      ? { part: jump.part, offset: scrollColumnWidth * (index + Number(!pinned)), anchor }
      : undefined;
  const columns = props.columns.map((column, index) => (
    <TableColumn
      key={column.id}
      column={column}
      index={index}
      {...layout}
      anchor={destination && column.id === jump?.column ? anchor : undefined}
    />
  ));
  return (
    <XStack {...root} width="100%" minWidth={component.base.none}>
      {pinned && heading}
      <MatrixScroll
        label={props.columns.map((column) => column.label).join(", ")}
        loading={props.loading}
        fitted={fitColumns}
        jump={destination}
      >
        {!pinned && heading}
        {props.timeline ? (
          <YStack>
            <XStack>{columns}</XStack>
            <TimelineRows {...layout.props} heights={heights} />
          </YStack>
        ) : (
          columns
        )}
      </MatrixScroll>
    </XStack>
  );
}
