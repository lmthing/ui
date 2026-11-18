import { useKit } from "../../provider";
import { usePartContext } from "../../part";
import { useSwipe } from "../../interact";
import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, elevation, radius, space, size, zIndex } from "../../../catalog";
import { usePart } from "../../part";
import { KitAction } from "../input";
import { KitText } from "../text";

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
  const kit = useKit();
  const context = usePartContext();
  const swipe = useSwipe("vertical", Boolean(kit.interactive && kit.controller), (direction) => {
    if (direction === "down") kit.controller?.press(`${context.screen}/${context.component}/close`);
  });
  return (
    <YStack
      y={swipe.offset}
      {...usePart("root")}
      backgroundColor="$raised"
      zIndex={zIndex.sheet}
      borderTopLeftRadius={radius.xl}
      borderTopRightRadius={radius.xl}
      paddingHorizontal={space.lg}
      paddingTop={space.sm}
      paddingBottom={Math.max(space.xl, kit.environment.insets.bottom)}
      gap={space.md}
      shadowRadius={elevation.sheet.shadowRadius}
      shadowOpacity={elevation.sheet.shadowOpacity}
      shadowOffset={{ width: 0, height: -elevation.sheet.offset }}
      elevation={elevation.sheet.elevation}
    >
      <YStack
        alignSelf="center"
        minHeight={size.control.md}
        minWidth={size.control.md}
        justifyContent="center"
        alignItems="center"
        {...(swipe.handlers as object)}
      >
        <YStack
          alignSelf="center"
          width={component.base.grabberWidth}
          height={space.xs}
          borderRadius={radius.pill}
          backgroundColor="$line"
          aria-hidden
        />
      </YStack>
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
