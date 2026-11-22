import { useState, type ReactNode } from "react";
import { isWeb, ScrollView, YStack } from "tamagui";
import { component, space } from "../../../catalog";
import { useKit } from "../../provider";
import type { BracketWindow } from "./bracket-layout";

function scrollKey(
  offsets: number[],
  event: {
    key: string;
    target: unknown;
    currentTarget: unknown;
    preventDefault(): void;
  },
) {
  if (event.target !== event.currentTarget) return;
  const node = event.currentTarget as HTMLElement;
  const left = node.scrollLeft;
  let next: number | undefined;
  if (event.key === "ArrowRight") next = offsets.find((x) => x > left + 1);
  if (event.key === "ArrowLeft") next = [...offsets].reverse().find((x) => x < left - 1);
  if (event.key === "End") next = offsets.at(-1);
  if (event.key === "Home") next = component.base.none;
  if (next !== undefined) {
    event.preventDefault();
    node.scrollTo({ left: next });
  }
}

function BracketScrollTrack({
  width,
  view,
  left,
  loading,
}: {
  width: number;
  view: number;
  left: number;
  loading: boolean;
}) {
  const traveled = Math.max(0, Math.min(width - view, left));
  return (
    <YStack
      marginHorizontal={space.md}
      marginBottom={space.md}
      height={space.xs}
      borderRadius={space.xs}
      backgroundColor="$line"
      aria-hidden
    >
      <YStack
        left={`${(traveled / width) * 100}%`}
        width={`${(view / width) * 100}%`}
        height="100%"
        borderRadius={space.xs}
        backgroundColor={loading ? "$line" : "$muted"}
      />
    </YStack>
  );
}

type ScrollProps = {
  children: ReactNode;
  width: number;
  view: number;
  offsets: number[];
  windows: BracketWindow[];
  label: string;
  loading: boolean;
};

function webScrollProps(loading: boolean, offsets: number[], change: (left: number) => void) {
  return {
    style: {
      overflowX: loading ? "hidden" : "auto",
      overflowY: "hidden",
      scrollSnapType: "x mandatory",
      scrollPaddingInline: space.md,
      scrollbarWidth: "none",
    },
    onScroll: (event: { currentTarget: HTMLElement }) => change(event.currentTarget.scrollLeft),
    onKeyDown: loading ? undefined : (event: Parameters<typeof scrollKey>[1]) => scrollKey(offsets, event),
  } as object;
}

export function BracketScroll({ children, width, view, offsets, windows, label, loading }: ScrollProps) {
  const { nativeHost } = useKit();
  const [left, setLeft] = useState(0);
  const overflow = view > 0 && width > view;
  const round = offsets.findIndex((offset, index) => left < (offset + (offsets[index + 1] ?? Infinity)) / 2);
  const frame = windows[Math.max(0, round)]!;
  const content = <YStack marginTop={-frame.top}>{children}</YStack>;
  return (
    <>
      {isWeb ? (
        <YStack
          role="region"
          tabIndex={!loading && overflow ? 0 : -1}
          height={frame.height}
          aria-label={loading ? undefined : label}
          {...webScrollProps(loading, offsets, setLeft)}
        >
          {content}
        </YStack>
      ) : (
        <ScrollView
          horizontal
          height={frame.height}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!loading}
          accessibilityRole="region"
          accessibilityLabel={loading ? undefined : label}
          snapToOffsets={offsets}
          decelerationRate="fast"
          onScroll={(event) => setLeft(event.nativeEvent.contentOffset.x)}
          onFocus={(event: { target: unknown }) => nativeHost?.ensureVisible?.(event.target)}
          scrollEventThrottle={16}
        >
          {content}
        </ScrollView>
      )}
      {overflow && <BracketScrollTrack {...{ width, view, left, loading }} />}
    </>
  );
}
