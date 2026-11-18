import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, parseAddress, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { MatrixContent, MatrixScroll } from "./matrix-drawing";
import {
  headingWidth,
  matrixWidth,
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
  return (
    <YStack
      {...(target as object)}
      minHeight={props.height}
      minWidth={size.control.md}
      paddingHorizontal={space.md}
      paddingVertical={space[ks.density.rowPad]}
      justifyContent="center"
      borderBottomWidth={props.cut ? component.base.strongBorder : component.base.borderWidth}
      borderColor={props.cut ? "$muted" : "$line"}
      backgroundColor={props.loading ? "$surface" : props.selected ? "$accentSoft" : "$surface"}
      {...(props.disabled ? { "aria-disabled": true } : {})}
    >
      <YStack
        onLayout={props.measure}
        pointerEvents={props.disabled ? "none" : "auto"}
        {...(props.disabled ? { inert: true } : {})}
      >
        <MatrixContent loading={props.loading}>{props.children}</MatrixContent>
      </YStack>
    </YStack>
  );
}

function ScopedCell({ item, ...props }: CellProps & { item?: string }) {
  const { item: inherited, ...context } = usePartContext();
  const id = props.target ? props.target.item : (item ?? inherited);
  const valid = id && parseAddress(`${context.screen}/${context.component}/${id}/root`)?.item === id;
  return (
    <PartContext.Provider value={{ ...context, ...(valid ? { item: id } : {}) }}>
      <TableCell {...props} />
    </PartContext.Provider>
  );
}

function TableColumn({
  column,
  index,
  props,
  heights,
}: {
  column?: Column;
  index: number;
  props: TableProps;
  heights: ReturnType<typeof useMatrixHeights>;
}) {
  const heading = !column,
    loading = Boolean(props.loading);
  return (
    <YStack width={heading ? headingWidth : matrixWidth} flexShrink={component.base.none}>
      <ScopedCell
        loading={loading}
        label={column?.label ?? ""}
        height={heights.height("header")}
        measure={heights.measure("header", column?.id ?? "corner")}
        target={props.headerTargets?.find((entry) => entry.column === column?.id)?.target}
        selected={column?.id === props.activeColumn}
      >
        {column?.header ?? props.corner}
      </ScopedCell>
      {props.rows.map((row) => {
        const cell = row.cells[index];
        return (
          <ScopedCell
            key={row.id}
            item={row.id}
            loading={loading}
            label={heading ? row.label : `${row.label}, ${column.label}`}
            height={heights.height(row.id)}
            measure={heights.measure(row.id, column?.id ?? "heading")}
            target={heading ? row.target : cell?.target}
            disabled={cell?.disabled && !heading}
            selected={row.selected || column?.id === props.activeColumn}
            cut={props.separators?.includes(row.id)}
          >
            {heading ? row.heading : cell?.content}
          </ScopedCell>
        );
      })}
      {!props.rows.length && (
        <YStack minHeight={size.control.md} backgroundColor={loading ? "$line" : "$surface"} />
      )}
    </YStack>
  );
}

/** Pinned labels and a sideways table retain control widths on web and native. */
export function KitTable({ part = "root", stickyFirst = true, ...props }: TableProps) {
  const ks = useKitStyle();
  const address = usePart(part);
  const heights = useMatrixHeights(space[ks.density.rowPad]);
  const all = { ...props, part, stickyFirst };
  return (
    <XStack {...address} minWidth={component.base.none} width="100%" aria-busy={Boolean(props.loading)}>
      {stickyFirst && <TableColumn index={-1} props={all} heights={heights} />}
      <MatrixScroll
        label={props.columns.map((column) => column.label).join(", ")}
        loading={Boolean(props.loading)}
      >
        {!stickyFirst && <TableColumn index={-1} props={all} heights={heights} />}
        {props.columns.map((column, index) => (
          <TableColumn key={column.id} column={column} index={index} props={all} heights={heights} />
        ))}
      </MatrixScroll>
    </XStack>
  );
}
