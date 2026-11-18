import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, elevation, radius, space } from "../../catalog";
import { usePart } from "../part";
import { KitAction } from "./KitAction";
import { KitText } from "./KitText";

/**
 * A panel that rises from the bottom over the screen: a grabber, a title with a close button, an optional
 * line under it, then its own content. The whole panel is the component's root part and the close button
 * the part `close`. It holds only its own items, never other components.
 */
export function KitSheet({
  title,
  sub,
  closeLabel,
  children,
}: {
  title: string;
  sub?: string | undefined;
  closeLabel: string;
  children: ReactNode;
}) {
  return (
    <YStack
      {...usePart("root")}
      backgroundColor="$raised"
      borderTopLeftRadius={radius.xl}
      borderTopRightRadius={radius.xl}
      paddingHorizontal={space.lg}
      paddingTop={space.sm}
      paddingBottom={space.xl}
      gap={space.md}
      shadowRadius={elevation.sheet.shadowRadius}
      shadowOpacity={elevation.sheet.shadowOpacity}
      shadowOffset={{ width: 0, height: -elevation.sheet.offset }}
      elevation={elevation.sheet.elevation}
    >
      <YStack
        alignSelf="center"
        width={component.base.grabberWidth}
        height={space.xs}
        borderRadius={radius.pill}
        backgroundColor="$line"
        aria-hidden
      />
      <XStack alignItems="center" justifyContent="space-between" gap={space.md}>
        <KitText role="heading" part="title">
          {title}
        </KitText>
        <KitAction icon="close" a11y={closeLabel} kind="quiet" part="close" />
      </XStack>
      {sub && (
        <KitText role="body" tone="muted" part="sub">
          {sub}
        </KitText>
      )}
      {children}
    </YStack>
  );
}
