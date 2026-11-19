import { Children, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, space, type AxisValue, type ThemeDensity } from "../../../catalog";
import { useVariantDensity } from "../../provider";
import { KitStrip } from "./KitStrip";

/**
 * Cells in equal-width columns (default 2). Cells in one row share a top edge; columns share left
 * edges; rows are spaced evenly. Wrap each cell's content in its own part (`KitRow` or `KitText`).
 */
export function KitGrid({
  columns = 2,
  fitLast = false,
  density,
  arrange = "grid",
  children,
}: {
  columns?: 2 | 3;
  /** Let the final column fit a short label, leaving the remaining width to the main content. */
  fitLast?: boolean;
  density?: ThemeDensity | undefined;
  /** Keep the same child addresses while switching to a flat row sequence or a sideways strip. */
  arrange?: AxisValue<"arrange">;
  children: ReactNode;
}) {
  const spacing = useVariantDensity(density);
  if (arrange === "rows") return <>{children}</>;
  if (arrange === "strip") return <KitStrip density={density}>{children}</KitStrip>;
  const cells = Children.toArray(children);
  const rows = Array.from({ length: Math.ceil(cells.length / columns) }, (_, row) =>
    cells.slice(row * columns, row * columns + columns),
  );
  return (
    <YStack width="100%" gap={space[spacing.gap]}>
      {rows.map((row, index) => (
        <XStack key={index} alignItems={fitLast ? "center" : "flex-start"} gap={space[spacing.columnGap]}>
          {Array.from({ length: columns }, (_, column) => (
            <YStack
              key={column}
              {...(fitLast && column === columns - 1
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
