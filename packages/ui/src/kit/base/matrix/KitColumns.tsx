import { Children, useRef, useState, type ReactNode, type RefObject } from "react";
import { XStack, YStack, isWeb } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { useMoveFocus } from "../../interact";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitRow } from "../surface";
import { KitIcon, KitText, shifted, surfaceOf } from "../text";
import { MatrixContent } from "./matrix-drawing";
import { MatrixScroll } from "./matrix-scroll";
import type { Drawing } from "./matrix-layout";

type ColumnItem = {
  id: string;
  column: number;
  label: string;
  goto?: string | undefined;
  children: ReactNode;
  destinations?: readonly { value: string; label: string }[] | undefined;
};
type ColumnMove = {
  cards: readonly ColumnItem[];
  caption: string;
  inlineCards?: boolean;
  reserveTargets?: boolean;
  /** Accessible name for the button that moves this card to the given column. */
  label: (destination: string, card: string) => string;
};
type DestinationProps = {
  destination: string;
  name: string;
  loading: boolean;
  press?: (() => void) | undefined;
};
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
  const web =
    isWeb && !loading
      ? { "data-step-action": "move", tabIndex: press ? 0 : -1, ...(press && { onKeyDown }) }
      : {};
  return (
    <XStack
      maxWidth="100%"
      minHeight={size.control.md}
      minWidth={size.control.md}
      paddingHorizontal={space.sm}
      alignItems="center"
      justifyContent="center"
      borderRadius={shifted("sm", ks.radiusShift)}
      backgroundColor={loading ? "$line" : "$raised"}
      accessibilityRole={loading ? undefined : "button"}
      accessibilityLabel={loading ? undefined : name}
      {...(web as object)}
      onPress={press}
    >
      {loading ? <YStack opacity={component.base.none}>{text}</YStack> : text}
    </XStack>
  );
}

type ItemProps = {
  card: ColumnItem;
  destinations: NonNullable<ColumnItem["destinations"]>;
  loading: boolean;
  move: ColumnMove;
  focus: RefObject<string | null>;
};
function ColumnItemRoot({ card, destinations, move, loading, focus }: ItemProps) {
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
            {destinations.map(({ value, label: destination }) => (
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

type ColumnsProps = Omit<Drawing, "part"> & {
  part?: string | null;
  columns: readonly {
    id: string;
    part?: string;
    label: string;
    count: string;
    countPart?: string;
    headingRole?: "body";
    /** Move value and button label each default to the column label. */
    moveValue?: string;
    moveLabel?: string;
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
  pageWidth: number;
  items: ReactNode;
};
function ColumnCard({ column, loading, stack, pageWidth, items }: CardProps) {
  const ks = useKitStyle();
  const empty = Children.toArray(column.children).length === 0;
  const addressed = Boolean(column.part && !loading);
  const address = usePart(column.part, addressed);
  return (
    <YStack
      {...(addressed ? address : {})}
      {...surfaceOf(ks.surface)}
      backgroundColor="$raised"
      borderRadius={shifted("md", ks.radiusShift)}
      width={stack ? "100%" : pageWidth || size.control.md * 4 + space.xl}
      flexShrink={component.base.none}
      {...(!stack && isWeb ? { style: { scrollSnapAlign: "start" } as never } : {})}
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

function ColumnPosition({ count, position }: { count: number; position: number }) {
  return (
    <XStack justifyContent="center" gap={space.xs} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <YStack
          key={index}
          width={component.base.dot}
          height={component.base.dot}
          borderRadius={radius.pill}
          backgroundColor={index === Math.min(position, count - 1) ? "$accent" : "$line"}
        />
      ))}
    </XStack>
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
  const [pageWidth, setPageWidth] = useState(0);
  const [position, setPosition] = useState(0);
  const stack = style === "stack" || columns.length < 2;
  const labels = columns.map((column) => column.label);
  const choices = columns.map((c) => ({ label: c.moveLabel ?? c.label, value: c.moveValue ?? c.label }));
  const values = choices.map(({ value }) => value);
  const cards = columns.map((column, index) => {
    const defaults = choices.filter(
      ({ label, value }, at) =>
        label && value && at !== index && values.indexOf(value) === values.lastIndexOf(value),
    );
    const items = move?.cards
      .filter((card) => card.column === index)
      .map((card) => (
        <PartContext.Provider key={card.id} value={{ ...context, item: card.id }}>
          <ColumnItemRoot {...{ card, loading, move, focus }} destinations={card.destinations ?? defaults} />
        </PartContext.Provider>
      ));
    return <ColumnCard key={column.id} {...{ column, loading, stack, pageWidth, items }} />;
  });
  return (
    <YStack
      {...(part === null ? {} : address)}
      minWidth={component.base.none}
      width="100%"
      aria-busy={loading}
      onLayout={(event) => {
        address.onLayout();
        if (!stack) setPageWidth(event.nativeEvent.layout.width);
      }}
    >
      {!columns.length ? null : stack ? (
        <YStack gap={space.md}>{cards}</YStack>
      ) : (
        <YStack gap={space.sm}>
          <MatrixScroll loading={loading} label={labels.join(", ")} pages={{ width: pageWidth, setPosition }}>
            <XStack alignItems="flex-start">{cards}</XStack>
          </MatrixScroll>
          <ColumnPosition count={cards.length} position={position} />
        </YStack>
      )}
    </YStack>
  );
}
