import { Children, useRef, type ReactNode, type RefObject } from "react";
import { XStack, YStack, isWeb } from "tamagui";
import { component, size, space } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitIcon, KitText, shifted, surfaceOf } from "../text";
import { KitRow } from "../surface";
import { MatrixContent, MatrixScroll } from "./matrix-drawing";
import { useMoveFocus } from "../../interact";
import type { Drawing } from "./matrix-layout";

type ColumnsProps = Drawing & {
  columns: readonly { id: string; label: string; count: string; summary?: ReactNode; children?: ReactNode }[];
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
      {items}
    </YStack>
  );
}

type ColumnItem = {
  id: string;
  column: number;
  label: string;
  goto?: string | undefined;
  children: ReactNode;
};
type ColumnMove = {
  cards: readonly ColumnItem[];
  caption: string;
  /** Accessible name for the button that moves this card to the given column. */
  label: (destination: string, card: string) => string;
};
type DestinationProps = { destination: string; name: string; press?: (() => void) | undefined };
function Destination({ destination, name, press }: DestinationProps) {
  const ks = useKitStyle();
  return (
    <XStack
      maxWidth="100%"
      minHeight={size.control.md}
      minWidth={size.control.md}
      paddingHorizontal={space.sm}
      alignItems="center"
      justifyContent="center"
      borderRadius={shifted("sm", ks.radiusShift)}
      backgroundColor="$raised"
      accessibilityRole="button"
      accessibilityLabel={name}
      {...(isWeb ? { "data-step-action": "move", tabIndex: press ? 0 : -1 } : {})}
      onPress={press}
      {...((isWeb && press
        ? {
            onKeyDown: (event: { key: string; preventDefault(): void }) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              press();
            },
          }
        : {}) as object)}
    >
      <KitText role="label" tone="text" part={null}>
        {destination}
      </KitText>
    </XStack>
  );
}

type ItemProps = {
  card: ColumnItem;
  destinations: readonly string[];
  loading: boolean;
  move: ColumnMove;
  focus: RefObject<string | null>;
};
function ItemRoot({ card, destinations, move: { caption, label }, loading, focus }: ItemProps) {
  const address = usePart("root", !loading);
  const { controller, interactive } = useKit();
  const runMove = useMoveFocus(focus, address.testID, address.ref);
  const active = interactive && controller;
  const offered = !loading && active && active.actionsAt(address.testID).includes("move");
  const press = (value: string) =>
    runMove(() => controller!.act({ address: address.testID, action: "move", value }));
  const row = (
    <KitRow
      label={card.label}
      goto={card.goto}
      inset="none"
      trailing={card.goto && <KitIcon name="chevron_right" decorative />}
    >
      {card.children}
    </KitRow>
  );
  return (
    <YStack
      {...(loading ? { "aria-hidden": true } : address)}
      {...(!loading && isWeb
        ? { accessibilityRole: "group", "aria-label": card.label, "data-kit-move-item": "", tabIndex: -1 }
        : {})}
    >
      <MatrixContent loading={loading}>{row}</MatrixContent>
      {!loading && destinations.length > 0 && (!interactive || !controller || offered) && (
        <YStack gap={space.xs}>
          <KitText role="caption" tone="muted" part={null}>
            {caption}
          </KitText>
          <XStack gap={space.xs} flexWrap="wrap">
            {destinations.map((destination) => (
              <Destination
                key={destination}
                destination={destination}
                name={label(destination, card.label)}
                press={offered ? () => press(destination) : undefined}
              />
            ))}
          </XStack>
        </YStack>
      )}
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
  const address = usePart(part);
  const context = usePartContext();
  const focus = useRef<string | null>(null);
  const stack = style === "stack";
  const labels = columns.map((column) => column.label);
  const cards = columns.map((column, index) => {
    const destinations = labels.filter(
      (label, at) => label && at !== index && labels.indexOf(label) === labels.lastIndexOf(label),
    );
    const items = move?.cards
      .filter((card) => card.column === index)
      .map((card) => (
        <PartContext.Provider key={card.id} value={{ ...context, item: card.id }}>
          <ItemRoot {...{ card, destinations, loading, move, focus }} />
        </PartContext.Provider>
      ));
    return <ColumnCard key={column.id} {...{ column, loading, stack, items }} />;
  });
  return (
    <YStack {...address} minWidth={component.base.none} width="100%" aria-busy={loading}>
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
