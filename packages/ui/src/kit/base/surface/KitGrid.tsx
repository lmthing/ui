import { Children, isValidElement, useRef, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, space, type AxisValue, type ThemeDensity } from "../../../catalog";
import { useKitStyle, useVariantDensity } from "../../provider";
import { KitText } from "../text";
import { KitStrip } from "./KitStrip";
import { KitMotion, KitPresence } from "../../motion";
import { useListReorder } from "./use-list-reorder";

type GridProps = {
  columns?: 2 | 3;
  /** Let the final column fit a short label, leaving the remaining width to the main content. */
  fitLast?: boolean;
  /** A fixed label rail with the following column taking the available space. */
  keyColumn?: boolean;
  /** Zero-based column-grid cell indices, within each group if grouped. */
  opposing?: readonly number[];
  density?: ThemeDensity | undefined;
  /** Cells are list items; headings and controls outside the cells are not. */
  list?: boolean;
  listRowGap?: "group" | "cards" | undefined;
  group?: AxisValue<"group">;
  /** Group membership and headings come from the caller; no group IDs are used to address items. */
  groups?: readonly { id: string; heading: string; children: ReactNode }[];
  children: ReactNode;
} & (
  | { arrange?: AxisValue<"arrange">; overflow?: "all" | undefined }
  | { arrange: "strip"; overflow?: Exclude<AxisValue<"overflow">, "peek"> | undefined }
);

const rowKey = (cell: ReactNode, index: number) =>
  isValidElement(cell) && cell.key !== null ? String(cell.key) : String(index);

function ListRows({ cells, gap, ruled }: { cells: ReactNode[]; gap: number | undefined; ruled: boolean }) {
  const keys = cells.map(rowKey);
  const initial = useRef(new Set(keys));
  const ref = useListReorder(JSON.stringify(keys));
  return (
    <YStack ref={ref} position="relative" accessibilityRole="list" gap={gap}>
      <KitPresence>
        {cells.map((cell, index) => (
          <MotionRow
            key={keys[index]}
            id={keys[index]!}
            appear={!initial.current.has(keys[index]!)}
            rule={ruled && index < cells.length - 1}
          >
            {cell}
          </MotionRow>
        ))}
      </KitPresence>
    </YStack>
  );
}

function MotionRow({
  children,
  id,
  appear,
  rule,
  exiting,
}: {
  children: ReactNode;
  id: string;
  appear: boolean;
  rule: boolean;
  exiting?: boolean;
}) {
  return (
    <YStack
      data-list-motion={id}
      accessibilityRole="listitem"
      {...(exiting ? { "aria-hidden": true, inert: true } : {})}
    >
      <KitMotion appear={appear} exiting={exiting ?? false}>
        {children}
        {rule && (
          <YStack
            height={component.base.borderWidth}
            backgroundColor="$line"
            marginHorizontal={space.md}
            aria-hidden
          />
        )}
      </KitMotion>
    </YStack>
  );
}

/**
 * Cells in equal-width columns (default 2). Cells in one row share a top edge; columns share left
 * edges; rows are spaced evenly. Wrap each cell's content in its own part (`KitRow` or `KitText`).
 */
export function KitGrid(props: GridProps) {
  const { columns = 2, fitLast = false, density, children, group = "none", groups, list } = props;
  const spacing = useVariantDensity(density);
  const { rowRule } = useKitStyle().frame;
  if (group !== "none" && groups?.length) {
    return (
      <YStack width="100%" gap={space[spacing.gap]}>
        {groups.map(({ id, heading, children }) => (
          <YStack key={id} gap={space[spacing.contentGap]}>
            <KitText density={density} role="label" tone="muted" part={null}>
              {heading}
            </KitText>
            <KitGrid {...props} group="none">
              {children}
            </KitGrid>
          </YStack>
        ))}
      </YStack>
    );
  }
  const cells = Children.toArray(children);
  const listRole = list && cells.length ? "list" : undefined;
  const listGaps = { cards: space[spacing.gap], group: space.xs };
  if (props.arrange === "rows")
    return listRole ? (
      <ListRows
        cells={cells}
        gap={props.listRowGap && listGaps[props.listRowGap]}
        ruled={rowRule && props.listRowGap !== "cards"}
      />
    ) : (
      <>{children}</>
    );
  if (props.arrange === "strip")
    return (
      <KitStrip density={density} overflow={props.overflow} list={listRole !== undefined}>
        {children}
      </KitStrip>
    );
  return (
    <ColumnGrid
      {...{
        cells,
        columns,
        fitLast,
        spacing,
        listRole,
        opposing: props.opposing,
        keyColumn: props.keyColumn,
      }}
    />
  );
}

function ColumnGrid({
  cells,
  columns,
  fitLast,
  spacing,
  listRole,
  opposing,
  keyColumn,
}: {
  cells: ReactNode[];
  columns: 2 | 3;
  fitLast: boolean;
  spacing: ReturnType<typeof useVariantDensity>;
  listRole: "list" | undefined;
  opposing: GridProps["opposing"];
  keyColumn: GridProps["keyColumn"];
}) {
  const rows = Array.from({ length: Math.ceil(cells.length / columns) }, (_, row) =>
    cells.slice(row * columns, row * columns + columns),
  );
  return (
    <YStack width="100%" gap={space[spacing.gap]} accessibilityRole={listRole}>
      {rows.map((row, index) => (
        <XStack
          key={index}
          {...(listRole ? { role: "presentation" as const } : {})}
          alignItems={fitLast ? "center" : "flex-start"}
          gap={space[keyColumn ? "sm" : spacing.columnGap]}
        >
          {Array.from({ length: columns }, (_, column) => (
            <YStack
              key={column}
              accessibilityRole={listRole && row[column] !== undefined ? "listitem" : undefined}
              aria-hidden={listRole && row[column] === undefined ? true : undefined}
              {...(row[column] !== undefined && opposing?.includes(index * columns + column)
                ? { rotate: "180deg" }
                : {})}
              {...(keyColumn && column === 0
                ? { width: component.base.keyColumnWidth }
                : fitLast && column === columns - 1
                  ? { flexShrink: component.base.none }
                  : { flex: component.base.bodyFlex, flexBasis: component.base.none })}
              minWidth={component.base.none}
            >
              {row[column] ?? null}
            </YStack>
          ))}
        </XStack>
      ))}
    </YStack>
  );
}
