import { Children, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, size, space } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { usePart } from "../../part";
import { KitText, shifted, surfaceOf } from "../text";
import { MatrixContent, MatrixScroll } from "./matrix-drawing";
import type { Drawing } from "./matrix-layout";

type ColumnsProps = Drawing & {
  columns: readonly { id: string; label: string; count: string; summary?: ReactNode; children: ReactNode }[];
  style?: "columns" | "stack";
};

function ColumnCard({
  column,
  loading,
  stack,
}: {
  column: ColumnsProps["columns"][number];
  loading: boolean;
  stack: boolean;
}) {
  const ks = useKitStyle();
  const empty = Children.toArray(column.children).length === 0;
  return (
    <YStack
      {...surfaceOf(ks.surface)}
      borderRadius={shifted("md", ks.radiusShift)}
      width={stack ? "100%" : size.control.md * 4 + space.xl}
      flexShrink={component.base.none}
      padding={space.md}
      gap={space[ks.density.gap]}
    >
      <MatrixContent loading={loading}>
        <XStack gap={space.md} alignItems="center" justifyContent="space-between">
          <YStack flex={component.base.bodyFlex}>
            <KitText role="heading" part={null}>
              {column.label}
            </KitText>
          </YStack>
          <KitText role="number" numberScale="compact" tabular part={null}>
            {column.count}
          </KitText>
        </XStack>
      </MatrixContent>
      {column.summary && <MatrixContent loading={loading}>{column.summary}</MatrixContent>}
      {!empty && <MatrixContent loading={loading}>{column.children}</MatrixContent>}
    </YStack>
  );
}

/** Counted columns scroll sideways or stack vertically; all copy and actions belong to callers. */
export function KitColumns({ part = "root", loading = false, columns, style = "columns" }: ColumnsProps) {
  const address = usePart(part);
  const stack = style === "stack";
  const cards = columns.map((column) => (
    <ColumnCard key={column.id} column={column} loading={loading} stack={stack} />
  ));
  return (
    <YStack {...address} minWidth={component.base.none} width="100%" aria-busy={loading}>
      {!columns.length ? null : stack ? (
        <YStack gap={space.md}>{cards}</YStack>
      ) : (
        <MatrixScroll loading={loading} label={columns.map((column) => column.label).join(", ")}>
          <XStack gap={space.md} alignItems="flex-start">
            {cards}
          </XStack>
        </MatrixScroll>
      )}
    </YStack>
  );
}
