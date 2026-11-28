import { Children, useRef, useState, type ElementRef, type ReactNode } from "react";
import { ScrollView, XStack, YStack, isWeb } from "tamagui";
import { component, radius, space, type AxisValue, type ThemeDensity } from "../../../catalog";
import { useKit, useVariantDensity, useWords } from "../../provider";
import { KitLocalAction } from "../text";
import type { ScrollHandle } from "./scroll-follow";

type StripProps = {
  children: ReactNode;
  pages?: boolean;
  /** A centred carousel uses the entire viewport for each slide. */
  fullPages?: boolean;
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
          width={index === at ? component.base.dot * 2 : component.base.dot}
          height={component.base.dot}
          borderRadius={radius.pill}
          backgroundColor={index === at ? "$accent" : "transparent"}
          borderColor={index === at ? "$accent" : "$muted"}
          borderWidth={component.base.borderWidth}
        />
      ))}
    </XStack>
  );
}

function StripControls({ count, at, go }: { count: number; at: number; go(index: number): void }) {
  const { interactive } = useKit();
  const { pageLabels } = useWords().words;
  return (
    <XStack alignItems="center" justifyContent={interactive ? "space-between" : "center"} gap={space.sm}>
      {interactive && (
        <KitLocalAction label={pageLabels.previous} disabled={at <= 0} onPress={() => go(at - 1)} />
      )}
      <StripPosition {...{ count, at }} />
      {interactive && (
        <KitLocalAction label={pageLabels.next} disabled={at >= count - 1} onPress={() => go(at + 1)} />
      )}
    </XStack>
  );
}

function useStrip(share: number, gap: number, multiplePages: boolean) {
  const [width, setWidth] = useState(0);
  const [at, setAt] = useState(0);
  const { environment } = useKit();
  const ref = useRef<ElementRef<typeof ScrollView>>(null);
  const cell = Math.round(width * share);
  const pageGap = multiplePages ? Math.max(gap, width - cell) : gap;
  const step = cell + pageGap;
  const go = (index: number) => {
    const scroller = ref.current as ScrollHandle | null;
    const animated = !environment.reduceMotion && !environment.agentMode;
    const node = isWeb ? scroller?.getScrollableNode?.() : undefined;
    const sign = node && getComputedStyle(node).direction === "rtl" ? -1 : 1;
    scroller?.scrollTo?.({ x: sign * index * step, y: 0, animated });
  };
  return { ref, width, setWidth, at, setAt, cell, step, pageGap, go };
}

function StripCells({
  cells,
  cell,
  pageGap,
  webSnap,
  list,
}: {
  cells: ReactNode[];
  cell: number;
  pageGap: number;
  webSnap: boolean;
  list: boolean;
}) {
  return (
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
  );
}

/**
 * A horizontal strip of cells, each `stripShare` (about 40%) of the strip's width so the third one is
 * partly visible and invites a swipe. With `pages`, each cell is nearly the full width, snaps into
 * place and a dot per cell shows where you are. `fullPages` centres the carousel at full width.
 */
export function KitStrip(props: StripProps) {
  const { children, pages = false, fullPages = false, overflow, density, list = false } = props;
  const cells = Children.toArray(children);
  const paged = overflow === undefined ? pages : overflow === "page";
  const gap = space[useVariantDensity(density).stripGap];
  const share = paged
    ? fullPages
      ? component.base.bodyFlex
      : component.base.pageShare
    : component.base.stripShare;
  const multiplePages = paged && cells.length > 1;
  const { ref, width, setWidth, at, setAt, cell, step, pageGap, go } = useStrip(share, gap, multiplePages);
  const webSnap = isWeb && multiplePages;
  return (
    <YStack width="100%" gap={gap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: component.base.bodyFlex,
          ...(multiplePages ? { paddingRight: width - cell } : {}),
        }}
        {...(webSnap ? { style: { scrollSnapType: "x mandatory" } as never } : {})}
        {...(paged && cell
          ? {
              snapToInterval: step,
              decelerationRate: "fast" as const,
              scrollEventThrottle: 32,
              onScroll: (event: { nativeEvent: { contentOffset: { x: number } } }) =>
                setAt(
                  Math.max(
                    0,
                    Math.min(
                      cells.length - 1,
                      Math.round(Math.abs(event.nativeEvent.contentOffset.x) / step),
                    ),
                  ),
                ),
            }
          : {})}
      >
        <StripCells {...{ cells, cell, pageGap, webSnap, list }} />
      </ScrollView>
      {multiplePages && <StripControls count={cells.length} {...{ at, go }} />}
    </YStack>
  );
}
