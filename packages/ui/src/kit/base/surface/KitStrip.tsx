import { Children, useState, type ReactNode } from "react";
import { ScrollView, XStack, YStack } from "tamagui";
import { component, radius, space, type AxisValue, type ThemeDensity } from "../../../catalog";
import { useVariantDensity } from "../../provider";

/**
 * A horizontal strip of cells, each `stripShare` (about 40%) of the strip's width so the third one is
 * partly visible and invites a swipe. With `pages`, each cell is nearly the full width, snaps into
 * place and a dot per cell shows where you are (a carousel). No visible scrollbar; token gap between cells.
 */
export function KitStrip({
  children,
  pages = false,
  overflow,
  density,
}: {
  children: ReactNode;
  pages?: boolean;
  /** `page` uses snapping pages; `all` exposes every cell in a continuous strip. */
  overflow?: Exclude<AxisValue<"overflow">, "peek"> | undefined;
  density?: ThemeDensity | undefined;
}) {
  const [width, setWidth] = useState(0);
  const [at, setAt] = useState(0);
  const cells = Children.toArray(children);
  const paged = overflow === undefined ? pages : overflow === "page";
  const gap = space[useVariantDensity(density).stripGap];
  const cell = Math.round(width * (paged ? component.base.pageShare : component.base.stripShare));
  return (
    <YStack width="100%" gap={gap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: component.base.bodyFlex }}
        {...(paged && cell
          ? {
              snapToInterval: cell + gap,
              decelerationRate: "fast" as const,
              scrollEventThrottle: 32,
              onScroll: (event: { nativeEvent: { contentOffset: { x: number } } }) =>
                setAt(Math.round(event.nativeEvent.contentOffset.x / (cell + gap))),
            }
          : {})}
      >
        <XStack gap={gap} paddingVertical={space.xs} marginHorizontal="auto" flexShrink={0}>
          {cells.map((child, index) => (
            <YStack key={index} width={cell || undefined} flexShrink={0}>
              {child}
            </YStack>
          ))}
        </XStack>
      </ScrollView>
      {paged && (
        <XStack justifyContent="center" gap={space.xs} aria-hidden>
          {cells.map((_, index) => (
            <YStack
              key={index}
              width={component.base.dot}
              height={component.base.dot}
              borderRadius={radius.pill}
              backgroundColor={index === at ? "$accent" : "$line"}
            />
          ))}
        </XStack>
      )}
    </YStack>
  );
}
