import { Children, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, space } from "../../catalog";
import { useKitStyle } from "../provider";

/**
 * Cells in equal-width columns (default 2). Cells in one row share a top edge; columns share left
 * edges; rows are spaced evenly. Wrap each cell's content in its own part (`KitRow` or `KitText`).
 */
export function KitGrid({ columns = 2, children }: { columns?: 2 | 3; children: ReactNode }) {
  const ks = useKitStyle();
  const cells = Children.toArray(children);
  const rows = Array.from({ length: Math.ceil(cells.length / columns) }, (_, row) =>
    cells.slice(row * columns, row * columns + columns),
  );
  return (
    <YStack gap={space[ks.density.gap]} paddingVertical={space.xs}>
      {rows.map((row, index) => (
        <XStack key={index} alignItems="flex-start" gap={space.md}>
          {Array.from({ length: columns }, (_, column) => (
            <YStack
              key={column}
              flex={component.base.bodyFlex}
              flexBasis={component.base.none}
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
