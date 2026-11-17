import { Children, useState, type ReactNode } from "react";
import { ScrollView, XStack, YStack } from "tamagui";
import { component, space } from "../../catalog";

/**
 * A horizontal strip of cells, each `stripShare` (about 40%) of the strip's width so the third one is
 * partly visible and invites a swipe. Scrolls sideways with no visible scrollbar; token gap between cells.
 */
export function KitStrip({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(0);
  const cell = Math.round(width * component.base.stripShare);
  return (
    <YStack width="100%" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={space.sm} paddingVertical={space.xs}>
          {Children.toArray(children).map((child, index) => (
            <YStack key={index} width={cell || undefined} flexShrink={0}>
              {child}
            </YStack>
          ))}
        </XStack>
      </ScrollView>
    </YStack>
  );
}
