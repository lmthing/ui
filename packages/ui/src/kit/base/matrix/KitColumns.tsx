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

type Column = {
  id: string;
  label: string;
  count: string;
  countPart?: string;
  /** Optional move value and button label both default to the column label. */
  moveValue?: string;
  moveLabel?: string;
  headingRole?: "body";
  summary?: ReactNode;
  children?: ReactNode;
};
type ColumnsProps = Drawing & {
  columns: readonly Column[];
  style?: "columns" | "stack";
  move?: ColumnMove;
};
type CardProps = { column: Column; loading: boolean; stack: boolean; items: ReactNode };
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
            <KitText
              role={column.headingRole ?? "heading"}
              emphasis={column.headingRole ? "strong" : undefined}
              part={null}
            >
              {column.label}
            </KitText>
          </YStack>
          <KitText role="number" numberScale="compact" tabular part={column.countPart ?? null}>
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
  inlineCards?: boolean;
  reserveTargets?: boolean;
  /** Accessible name for the button that moves this card to the given column. */
  label: (destination: string, card: string) => string;
};
// prettier-ignore
type DestinationProps = { destination: string; name: string; loading: boolean; press?: (() => void) | undefined };
// prettier-ignore
function Destination({ destination, name, loading, press }: DestinationProps) {
  const ks = useKitStyle();
  const onKeyDown = (event: { key: string; preventDefault(): void }) => {
    if (!press || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    press();
  };
  const text = (
    <KitText role="label" part={null}>
      {destination}
    </KitText>
  );
  const web = isWeb && !loading
    ? { "data-step-action": "move", tabIndex: press ? 0 : -1, ...(press && { onKeyDown }) }
    : {};
  return <XStack maxWidth="100%" minHeight={size.control.md} minWidth={size.control.md}
    paddingHorizontal={space.sm} alignItems="center" justifyContent="center"
    borderRadius={shifted("sm", ks.radiusShift)} backgroundColor={loading ? "$line" : "$raised"}
    accessibilityRole={loading ? undefined : "button"} accessibilityLabel={loading ? undefined : name}
    {...(web as object)} onPress={press}>
    {loading ? <YStack opacity={component.base.none}>{text}</YStack> : text}
  </XStack>;
}

type ItemProps = {
  card: ColumnItem;
  destinations: readonly { label: string; value: string }[];
  loading: boolean;
  move: ColumnMove;
  focus: RefObject<string | null>;
};
function ItemRoot({ card, destinations, move, loading, focus }: ItemProps) {
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
      inline={move.inlineCards ?? false}
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
      {destinations.length > 0 && (loading ? move.reserveTargets : !active || offered) && (
        <YStack gap={space.xs}>
          <MatrixContent loading={loading}>
            <KitText role="caption" tone="muted" part={null}>
              {move.caption}
            </KitText>
          </MatrixContent>
          <XStack gap={space.xs} flexWrap="wrap">
            {destinations.map(({ label: destination, value }) => (
              <Destination
                key={value}
                destination={destination}
                name={move.label(destination, card.label)}
                loading={loading}
                press={offered ? () => press(value) : undefined}
              />
            ))}
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}

/** Counted columns scroll sideways or stack vertically; all copy and actions belong to callers. */
export function KitColumns({ part = "root", loading = false, columns, style, move }: ColumnsProps) {
  const address = usePart(part);
  const context = usePartContext();
  const focus = useRef<string | null>(null);
  const stack = style === "stack";
  const choices = columns.map((c) => ({ label: c.moveLabel ?? c.label, value: c.moveValue ?? c.label }));
  const values = choices.map(({ value }) => value);
  const cards = columns.map((column, index) => {
    const destinations = choices.filter(
      ({ label, value }, at) =>
        label && value && at !== index && values.indexOf(value) === values.lastIndexOf(value),
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
        <MatrixScroll loading={loading} label={columns.map(({ label }) => label).join(", ")}>
          <XStack gap={space.md} alignItems="flex-start">
            {cards}
          </XStack>
        </MatrixScroll>
      )}
    </YStack>
  );
}
