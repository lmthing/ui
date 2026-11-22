import type { ReactNode, RefObject } from "react";
import { XStack, YStack, isWeb } from "tamagui";
import { size, space } from "../../../catalog";
import { useMoveFocus } from "../../interact";
import { usePart } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitRow } from "../surface";
import { KitIcon, KitText, shifted } from "../text";
import { MatrixContent } from "./matrix-drawing";

type ColumnItem = {
  id: string;
  column: number;
  label: string;
  goto?: string | undefined;
  children: ReactNode;
  destinations?: readonly { value: string; label: string }[] | undefined;
};
export type ColumnMove = {
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
  destinations: NonNullable<ColumnItem["destinations"]>;
  loading: boolean;
  move: ColumnMove;
  focus: RefObject<string | null>;
};
export function ColumnItemRoot({ card, destinations, move: { caption, label }, loading, focus }: ItemProps) {
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
            {destinations.map(({ value, label: destination }) => (
              <Destination
                key={value}
                destination={destination}
                name={label(destination, card.label)}
                press={offered ? () => press(value) : undefined}
              />
            ))}
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
