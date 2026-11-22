import { Children, useRef, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, size, space } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitText, shifted, surfaceOf } from "../text";
import { MatrixContent, MatrixScroll } from "./matrix-drawing";
import { ColumnItemRoot, type ColumnMove } from "./column-item";
import type { Drawing } from "./matrix-layout";

type ColumnsProps = Omit<Drawing, "part"> & {
  part?: string | null;
  columns: readonly {
    id: string;
    part?: string;
    label: string;
    count: string;
    summary?: ReactNode;
    children?: ReactNode;
  }[];
  style?: "columns" | "stack";
  move?: ColumnMove;
};
type CardProps = {
  column: ColumnsProps["columns"][number];
  loading: boolean;
  stack: boolean;
  items: ReactNode;
};
function ColumnCard({ column, loading, stack, items }: CardProps) {
  const ks = useKitStyle();
  const empty = Children.toArray(column.children).length === 0;
  const addressed = Boolean(column.part && !loading);
  const address = usePart(column.part, addressed);
  return (
    <YStack
      {...(addressed ? address : {})}
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
      {items}
    </YStack>
  );
}

/** Counted columns scroll sideways or stack vertically; all copy and actions belong to callers. */
export function KitColumns({
  part = "root",
  loading = false,
  columns,
  style = "columns",
  move,
}: ColumnsProps) {
  const address = usePart(part ?? undefined, part !== null);
  const context = usePartContext();
  const focus = useRef<string | null>(null);
  const stack = style === "stack";
  const labels = columns.map((column) => column.label);
  const cards = columns.map((column, index) => {
    const defaults = labels
      .filter((label, at) => label && at !== index && labels.indexOf(label) === labels.lastIndexOf(label))
      .map((label) => ({ value: label, label }));
    const items = move?.cards
      .filter((card) => card.column === index)
      .map((card) => (
        <PartContext.Provider key={card.id} value={{ ...context, item: card.id }}>
          <ColumnItemRoot {...{ card, loading, move, focus }} destinations={card.destinations ?? defaults} />
        </PartContext.Provider>
      ));
    return <ColumnCard key={column.id} {...{ column, loading, stack, items }} />;
  });
  return (
    <YStack
      {...(part === null ? {} : address)}
      minWidth={component.base.none}
      width="100%"
      aria-busy={loading}
    >
      {!columns.length ? null : stack ? (
        <YStack gap={space.md}>{cards}</YStack>
      ) : (
        <MatrixScroll loading={loading} label={labels.join(", ")}>
          <XStack gap={space.md} alignItems="flex-start">
            {cards}
          </XStack>
        </MatrixScroll>
      )}
    </YStack>
  );
}
