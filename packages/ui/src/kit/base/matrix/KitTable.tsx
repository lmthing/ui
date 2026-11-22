import { useContext, useRef, type ReactNode, type RefObject } from "react";
import { XStack, YStack, type TamaguiElement } from "tamagui";
import { component, parseAddress, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { MatrixScroll } from "./matrix-scroll";
import { MatrixContent } from "./matrix-drawing";
import {
  disabledContent,
  fittedTableWidth,
  matrixColumnLayout,
  MatrixSelectionContext,
  scrollColumnWidth,
  useColumnViewport,
  useCompactMatrix,
  useMatrixHeights,
  type Column,
  type Drawing,
  type MatrixRow,
  type Target,
} from "./matrix-layout";
import { timelineLayout } from "./timeline-layout";

type CellProps = {
  children: ReactNode;
  label: string;
  target?: Target | undefined;
  disabled?: boolean | undefined;
  selected?: boolean | undefined;
  loading: boolean;
  cut?: boolean | undefined;
  last?: boolean;
  height: number;
  fit?: boolean | undefined;
  contentWidth?: boolean | undefined;
  divider?: boolean;
  rail?: boolean;
  anchor?: RefObject<TamaguiElement | null> | undefined;
  measure: ReturnType<ReturnType<typeof useMatrixHeights>["measure"]>;
};

function useCellTarget({ target, disabled, selected, loading, label, anchor }: CellProps) {
  const kit = useKit();
  const address = usePart(target?.part ?? "root", Boolean(target) && !loading);
  const press = () => kit.controller?.press(address.testID);
  const anchorProps = anchor
    ? {
        accessible: true,
        ref: (node: TamaguiElement | null) => {
          anchor.current = node;
          address.ref.current = node;
        },
        ...(!target ? { tabIndex: -1 as const, accessibilityLabel: label } : {}),
      }
    : {};
  return !target || loading
    ? anchorProps
    : {
        ...address,
        ...anchorProps,
        accessibilityRole: "button",
        accessibilityLabel: label,
        "aria-pressed": Boolean(selected),
        "aria-disabled": Boolean(disabled),
        disabled,
        focusable: !disabled,
        ...(kit.interactive && kit.controller && !disabled
          ? {
              cursor: "pointer",
              onPress: (event: { stopPropagation?(): void }) => {
                event.stopPropagation?.();
                press();
              },
              onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  press();
                }
              },
            }
          : {}),
      };
}
function TableCell(props: CellProps) {
  const ks = useKitStyle();
  const target = useCellTarget(props);
  const highlight = props.selected && !props.loading;
  const fill = highlight ? { backgroundColor: "$accentSoft" } : {};
  const rule = props.divider ? { borderLeftWidth: component.base.borderWidth, borderColor: "$line" } : {};
  return (
    <YStack
      {...(target as object)}
      minHeight={props.height + (props.cut ? component.base.borderWidth : component.base.none)}
      minWidth={props.rail && !props.target ? component.base.none : size.control.md}
      paddingHorizontal={props.fit ? space.xs : props.contentWidth && !props.rail ? space.sm : space.md}
      paddingVertical={space[ks.density.rowPad]}
      justifyContent="center"
      borderBottomWidth={
        props.cut
          ? component.base.strongBorder
          : props.last
            ? component.base.none
            : component.base.borderWidth
      }
      borderColor={props.cut ? "$muted" : "$line"}
      {...(props.fit && !props.loading ? {} : { backgroundColor: highlight ? "$accentSoft" : "$surface" })}
      {...(props.disabled ? { "aria-disabled": true } : {})}
    >
      {props.fit && (highlight || props.divider) && (
        <YStack fullscreen pointerEvents="none" aria-hidden {...fill} {...rule} />
      )}
      <YStack
        onLayout={props.measure}
        pointerEvents={props.disabled ? "none" : "auto"}
        {...(props.disabled ? { inert: true } : {})}
      >
        <MatrixContent loading={props.loading}>
          {props.disabled ? disabledContent(props.children) : props.children}
        </MatrixContent>
      </YStack>
    </YStack>
  );
}
function ScopedCell({ item, ...props }: CellProps & { item?: string }) {
  const { item: inherited, ...context } = usePartContext();
  const id = props.target ? props.target.item : (item ?? inherited);
  const valid =
    id && (props.target || parseAddress(`${context.screen}/${context.component}/${id}/root`)?.item === id);
  return (
    <PartContext.Provider value={{ ...context, ...(valid ? { item: id } : {}) }}>
      <TableCell {...props} />
    </PartContext.Provider>
  );
}

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

function TimelineRows(props: TimelineProps) {
  const { rows, columns, heights, activeColumn, loading, separators } = props;
  const selected = useContext(MatrixSelectionContext);
  return rows.map((row, index) => (
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
              last={index === rows.length - 1}
            >
              {cell?.content}
            </ScopedCell>
          </YStack>
        );
      })}
    </XStack>
  ));
}

type TableProps = Drawing & {
  columns: readonly Column[];
  rows: readonly MatrixRow[];
  corner: ReactNode;
  stickyFirst?: boolean;
  fitColumns?: boolean | undefined;
  /** Size scrolling columns to their content rather than to the fixed-width timeline grid. */
  contentWidth?: boolean;
  activeColumn?: string;
  headerTargets?: readonly { column: string; target: Target }[];
  separators?: readonly string[];
  timeline?: { jump?: { part: string; column: string } };
};
type ColumnProps = {
  column?: Column;
  index: number;
  props: TableProps;
  heights: ReturnType<typeof useMatrixHeights>;
  compact: boolean;
  anchor?: React.RefObject<TamaguiElement | null> | undefined;
  onLayout?: ReturnType<typeof useCompactMatrix>["onHeadingLayout"];
};

function TableColumn({ column, index, props, heights, compact, anchor, onLayout }: ColumnProps) {
  const heading = !column;
  const loading = Boolean(props.loading);
  const selected = useContext(MatrixSelectionContext);
  const active = Boolean(column && (column.id === props.activeColumn || selected.includes(column.id)));
  const fit = {
    rail: heading,
    fit: props.fitColumns,
    divider: Boolean(props.fitColumns && compact && index > 0),
    contentWidth: Boolean(props.contentWidth),
  };
  return (
    <YStack
      {...matrixColumnLayout(Boolean(props.fitColumns), heading, props.contentWidth)}
      onLayout={onLayout}
    >
      <ScopedCell
        loading={loading}
        last={!props.rows.length}
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
        props.rows.map((row, rowIndex) => {
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
              last={rowIndex === props.rows.length - 1}
            >
              {heading ? row.heading : compact ? (cell?.compactContent ?? cell?.content) : cell?.content}
            </ScopedCell>
          );
        })}
    </YStack>
  );
}

function useTimelineDestination(props: TableProps, pinned: boolean) {
  const anchor = useRef<TamaguiElement>(null);
  const jump = props.timeline?.jump;
  const index = props.columns.findIndex((column) => column.id === jump?.column);
  return jump && index >= 0 && !props.loading
    ? { part: jump.part, offset: scrollColumnWidth * (index + Number(!pinned)), anchor }
    : undefined;
}

export function KitTable({ part = "root", stickyFirst = true, ...props }: TableProps) {
  const ks = useKitStyle();
  const heights = useMatrixHeights(space[ks.density.rowPad]);
  const fitColumns = !props.timeline && Boolean(props.fitColumns);
  const contentWidth = !props.timeline && !fitColumns && Boolean(props.contentWidth);
  const { compact, available, onLayout, onHeadingLayout } = useCompactMatrix(fitColumns, contentWidth);
  const viewport = useColumnViewport(props.columns, available, contentWidth && stickyFirst);
  const address = usePart(part);
  const root = {
    ...address,
    onLayout: (event: Parameters<NonNullable<typeof onLayout>>[0]) => {
      address.onLayout();
      onLayout?.(event);
    },
    "aria-busy": Boolean(props.loading),
  };
  const layout = { props: { ...props, fitColumns, contentWidth }, heights, compact };
  const heading = <TableColumn index={-1} {...layout} onLayout={onHeadingLayout} />;
  const pinned = stickyFirst || fitColumns;
  const destination = useTimelineDestination(props, pinned);
  const columns = props.columns.map((column, index) => (
    <TableColumn
      key={column.id}
      column={column}
      index={index}
      {...layout}
      onLayout={viewport.measure(column.id)}
      anchor={column.id === props.timeline?.jump?.column ? destination?.anchor : undefined}
    />
  ));
  const minWidth = fittedTableWidth(columns.length);
  const overflow = fitColumns && available !== undefined && available < minWidth;
  return (
    <XStack {...root} width="100%" minWidth={component.base.none}>
      {pinned && heading}
      <MatrixScroll
        label={props.columns.map((column) => column.label).join(", ")}
        loading={props.loading}
        fitted={fitColumns && !overflow}
        jump={destination}
        width={viewport.width}
      >
        {!pinned && heading}
        {props.timeline ? (
          <YStack>
            <XStack>{columns}</XStack>
            <TimelineRows {...layout.props} heights={heights} />
          </YStack>
        ) : overflow ? (
          <XStack width={minWidth}>{columns}</XStack>
        ) : (
          columns
        )}
      </MatrixScroll>
    </XStack>
  );
}
