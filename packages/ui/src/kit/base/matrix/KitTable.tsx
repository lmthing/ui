import { useContext, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, parseAddress, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { MatrixContent, MatrixScroll } from "./matrix-drawing";
import {
  disabledContent,
  fittedTableWidth,
  matrixColumnLayout,
  MatrixSelectionContext,
  useCompactMatrix,
  useMatrixHeights,
  type Column,
  type Drawing,
  type MatrixRow,
  type Target,
} from "./matrix-layout";

type TableProps = Drawing & {
  columns: readonly Column[];
  rows: readonly MatrixRow[];
  corner: ReactNode;
  stickyFirst?: boolean;
  fitColumns?: boolean | undefined;
  activeColumn?: string;
  headerTargets?: readonly { column: string; target: Target }[];
  separators?: readonly string[];
};
type CellProps = {
  children: ReactNode;
  label: string;
  target?: Target | undefined;
  disabled?: boolean | undefined;
  selected?: boolean | undefined;
  loading: boolean;
  cut?: boolean | undefined;
  height: number;
  fit?: boolean | undefined;
  divider?: boolean;
  rail?: boolean;
  measure: ReturnType<ReturnType<typeof useMatrixHeights>["measure"]>;
};

function useCellTarget({ target, disabled, selected, loading, label }: CellProps) {
  const kit = useKit();
  const address = usePart(target?.part ?? "root", Boolean(target) && !loading);
  const press = () => kit.controller?.press(address.testID);
  return !target || loading
    ? {}
    : {
        ...address,
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
      paddingHorizontal={props.fit ? space.xs : space.md}
      paddingVertical={space[ks.density.rowPad]}
      justifyContent="center"
      borderBottomWidth={props.cut ? component.base.strongBorder : component.base.borderWidth}
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

type ColumnProps = {
  column?: Column;
  index: number;
  props: TableProps;
  heights: ReturnType<typeof useMatrixHeights>;
  compact: boolean;
  onLayout?: ReturnType<typeof useCompactMatrix>["onHeadingLayout"];
};
function TableColumn({ column, index, props, heights, compact, onLayout }: ColumnProps) {
  const heading = !column,
    loading = Boolean(props.loading);
  const selected = useContext(MatrixSelectionContext);
  const active = Boolean(column && (column.id === props.activeColumn || selected.includes(column.id)));
  const fit = props.fitColumns ? { fit: true, rail: heading, divider: compact && index > 0 } : {};
  return (
    <YStack {...matrixColumnLayout(Boolean(props.fitColumns), heading)} onLayout={onLayout}>
      <ScopedCell
        loading={loading}
        {...fit}
        label={column?.label ?? ""}
        height={heights.height("header")}
        measure={heights.measure("header", column?.id ?? "corner")}
        target={props.headerTargets?.find((entry) => entry.column === column?.id)?.target}
        selected={active}
      >
        {heading ? props.corner : column.header}
      </ScopedCell>
      {props.rows.map((row) => {
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
  const { compact, available, onLayout, onHeadingLayout } = useCompactMatrix(Boolean(props.fitColumns));
  const root = { ...usePart(part), onLayout, "aria-busy": Boolean(props.loading) };
  const layout = { props, heights, compact },
    heading = <TableColumn index={-1} {...layout} onLayout={onHeadingLayout} />;
  const pinned = stickyFirst || props.fitColumns;
  const columns = props.columns.map((column, index) => (
    <TableColumn key={column.id} {...{ column, index, ...layout }} />
  ));
  const minWidth = fittedTableWidth(columns.length);
  const overflow = props.fitColumns && available !== undefined && available < minWidth;
  return (
    <XStack {...root} width="100%" minWidth={component.base.none}>
      {pinned && heading}
      {props.fitColumns && !overflow ? (
        columns
      ) : (
        <MatrixScroll label={props.columns.map((column) => column.label).join(", ")} loading={props.loading}>
          {!pinned && heading}
          {overflow ? <XStack width={minWidth}>{columns}</XStack> : columns}
        </MatrixScroll>
      )}
    </XStack>
  );
}
