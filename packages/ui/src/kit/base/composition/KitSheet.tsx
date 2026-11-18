import { useKit, useKitStyle } from "../../provider";
import { usePartContext } from "../../part";
import { useSwipe } from "../../interact";
import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, radius, space, size, zIndex } from "../../../catalog";
import { usePart } from "../../part";
import { KitAction } from "../input";
import { KitText, shifted, surfaceOf } from "../text";

/**
 * A panel that rises from the bottom over the screen: a grabber, a title with a close button, an optional
 * line under it, then its own content. The whole panel is the component's root part and the close button
 * the part `close`. It holds only its own items, never other components.
 */
type SheetProps = {
  title: string;
  sub?: string | undefined;
  closeLabel: string;
  children: ReactNode;
};

function Grabber({ handlers }: { handlers: object }) {
  return (
    <YStack alignSelf="center" width={component.base.grabberWidth} height={space.xs}>
      <YStack
        position="absolute"
        top={component.base.grabberHitOffset}
        minHeight={size.control.md}
        minWidth={size.control.md}
        justifyContent="center"
        alignItems="center"
        {...handlers}
      >
        <YStack
          width={component.base.grabberWidth}
          height={space.xs}
          borderRadius={radius.pill}
          backgroundColor="$line"
          aria-hidden
        />
      </YStack>
    </YStack>
  );
}

export function KitSheet({ title, sub, closeLabel, children }: SheetProps) {
  const kit = useKit();
  const ks = useKitStyle();
  const context = usePartContext();
  const swipe = useSwipe("vertical", Boolean(kit.interactive && kit.controller), (direction) => {
    if (direction === "down") kit.controller?.press(`${context.screen}/${context.component}/close`);
  });
  return (
    <YStack
      y={swipe.offset}
      {...usePart("root")}
      {...surfaceOf(ks.surface)}
      zIndex={zIndex.sheet}
      borderTopLeftRadius={shifted("md", ks.radiusShift)}
      borderTopRightRadius={shifted("md", ks.radiusShift)}
      paddingHorizontal={space.lg}
      paddingTop={space.xl}
      paddingBottom={Math.max(space.xl, kit.environment.insets.bottom)}
      gap={space.md}
    >
      <Grabber handlers={swipe.handlers as object} />
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
