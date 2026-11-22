import { Children, useState, type ReactNode } from "react";
import { ScrollView, XStack, YStack, isWeb } from "tamagui";
import { component, radius, space, type AxisValue, type ThemeDensity } from "../../../catalog";
import { useVariantDensity } from "../../provider";

type StripProps = {
  children: ReactNode;
  pages?: boolean;
  /** `page` uses snapping pages; `all` exposes every cell in a continuous strip. */
  overflow?: Exclude<AxisValue<"overflow">, "peek"> | undefined;
  density?: ThemeDensity | undefined;
  list?: boolean;
};

function StripPosition({ count, at }: { count: number; at: number }) {
  return (
    <XStack justifyContent="center" gap={space.xs} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <YStack
          key={index}
          width={component.base.dot}
          height={component.base.dot}
          borderRadius={radius.pill}
          backgroundColor={index === at ? "$accent" : "$line"}
        />
      ))}
    </XStack>
  );
}

/**
 * A horizontal strip of cells, each `stripShare` (about 40%) of the strip's width so the third one is
 * partly visible and invites a swipe. With `pages`, each cell is nearly the full width, snaps into
 * place and a dot per cell shows where you are (a carousel). No visible scrollbar; token gap between cells.
 */
export function KitStrip({ children, pages = false, overflow, density, list = false }: StripProps) {
  const [width, setWidth] = useState(0);
  const [at, setAt] = useState(0);
  const cells = Children.toArray(children);
  const paged = overflow === undefined ? pages : overflow === "page";
  const gap = space[useVariantDensity(density).stripGap];
  const cell = Math.round(width * (paged ? component.base.pageShare : component.base.stripShare));
  const multiplePages = paged && cells.length > 1;
  const pageGap = multiplePages ? Math.max(gap, width - cell) : gap;
  const webSnap = isWeb && multiplePages;
  return (
    <YStack width="100%" gap={gap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: component.base.bodyFlex,
          ...(multiplePages ? { paddingRight: width - cell } : {}),
        }}
        {...(webSnap ? { style: { scrollSnapType: "x mandatory" } as never } : {})}
        {...(paged && cell
          ? {
              snapToInterval: cell + pageGap,
              decelerationRate: "fast" as const,
              scrollEventThrottle: 32,
              onScroll: (event: { nativeEvent: { contentOffset: { x: number } } }) =>
                setAt(Math.round(event.nativeEvent.contentOffset.x / (cell + pageGap))),
            }
          : {})}
      >
        <XStack
          gap={pageGap}
          paddingVertical={space.xs}
          marginHorizontal="auto"
          flexShrink={0}
          accessibilityRole={list && cells.length ? "list" : undefined}
        >
          {cells.map((child, index) => (
            <YStack
              key={index}
              accessibilityRole={list ? "listitem" : undefined}
              width={cell || undefined}
              flexShrink={0}
              {...(webSnap ? { style: { scrollSnapAlign: "start" } as never } : {})}
            >
              {child}
            </YStack>
          ))}
        </XStack>
      </ScrollView>
      {paged && <StripPosition count={cells.length} at={at} />}
    </YStack>
  );
}
