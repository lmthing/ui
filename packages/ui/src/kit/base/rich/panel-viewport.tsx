import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { isWeb, ScrollView, YStack, type TamaguiElement } from "tamagui";
import { component } from "../../../catalog";
import { useWords } from "../../provider";

type Mode = "strip" | "ltr" | "rtl";
type ViewportProps = {
  mode: Mode;
  width: number;
  height: number;
  total: number;
  offsets: readonly number[];
  current: number;
  loading: boolean;
  children: (active: number) => ReactNode;
};
type NativeScroll = { scrollTo(options: { x: number; y: number; animated: boolean }): void };
const clamp = (value: number, max: number) => Math.max(0, Math.min(value, max));

function useViewport({ mode, width, height, total, offsets, current, loading }: ViewportProps) {
  const web = useRef<TamaguiElement>(null);
  const native = useRef<NativeScroll>(null);
  const [active, setActive] = useState(current);
  const position = useRef(current);
  const requested = useRef(current);
  const strip = mode === "strip";
  const rtl = mode === "rtl";
  const max = strip ? Math.max(0, total - height) : (offsets.length - 1) * width;
  const offsetAt = (index: number) => clamp(offsets[index] ?? 0, max);
  const sync = (index: number) => {
    const logical = offsetAt(index);
    if (isWeb) {
      (web.current as HTMLElement | null)?.scrollTo({
        top: strip ? logical : 0,
        left: rtl ? -logical : strip ? 0 : logical,
        behavior: "instant",
      });
    } else {
      native.current?.scrollTo({
        x: rtl ? max - logical : strip ? 0 : logical,
        y: strip ? logical : 0,
        animated: false,
      });
    }
    position.current = index;
    setActive(index);
  };
  const offsetsKey = offsets.join();
  useLayoutEffect(() => {
    const next = loading || current !== requested.current ? current : position.current;
    requested.current = current;
    if (width > 0) sync(clamp(next, offsets.length - 1));
  }, [current, mode, width, height, max, offsetsKey, loading]);

  function track(value: number) {
    if (loading || width <= 0) return;
    const logical = clamp(value, max);
    const closeTo = (index: number) => Math.abs(logical - offsetAt(index));
    // When several final strip panels share the same clamped offset, keep the requested panel.
    const next = offsets.reduce(
      (best, _, index) => (closeTo(index) < closeTo(best) ? index : best),
      clamp(position.current, offsets.length - 1),
    );
    position.current = next;
    setActive(next);
  }
  return { web, native, max, track, sync, active };
}

type ScrollKey = Pick<
  KeyboardEvent,
  "key" | "target" | "currentTarget" | "preventDefault" | "defaultPrevented"
>;
function pageKey(event: ScrollKey, active: number, last: number, rtl: boolean, go: (at: number) => void) {
  if (event.target !== event.currentTarget || event.defaultPrevented) return;
  const delta = rtl ? -1 : 1;
  const byKey: Record<string, number> = {
    Home: 0,
    End: last,
    ArrowLeft: active - delta,
    ArrowRight: active + delta,
  };
  if (byKey[event.key] === undefined) return;
  event.preventDefault();
  go(clamp(byKey[event.key]!, last));
}

export function PanelViewport(props: ViewportProps) {
  const { mode, height, offsets, loading, children } = props;
  const { panelLabels, loadingLabel } = useWords().words;
  const { web, native, max, track, sync, active } = useViewport(props);
  const strip = mode === "strip";
  const rtl = mode === "rtl";
  const label = loading ? loadingLabel : panelLabels.reader;
  if (isWeb)
    return (
      <YStack
        ref={web}
        height={height}
        role="region"
        aria-label={label}
        tabIndex={!loading && max > 0 ? 0 : -1}
        {...({
          dir: rtl ? "rtl" : "ltr",
          style: {
            overflowX: loading || strip ? "hidden" : "auto",
            overflowY: loading || !strip ? "hidden" : "auto",
            scrollSnapType: strip ? undefined : "x mandatory",
            scrollbarWidth: strip ? undefined : "none",
          },
          onScroll: (event: { currentTarget: HTMLElement }) =>
            track(strip ? event.currentTarget.scrollTop : (rtl ? -1 : 1) * event.currentTarget.scrollLeft),
          onKeyDown: (event: ScrollKey) => {
            if (!loading && !strip) pageKey(event, active, offsets.length - 1, rtl, sync);
          },
        } as object)}
      >
        {children(active)}
      </YStack>
    );
  return (
    <ScrollView
      ref={native as never}
      height={height}
      horizontal={!strip}
      pagingEnabled={!strip}
      scrollEnabled={!loading}
      showsHorizontalScrollIndicator={false}
      accessibilityRole="region"
      accessibilityLabel={label}
      style={{ direction: "ltr" }}
      scrollEventThrottle={16}
      onScroll={({
        nativeEvent: {
          contentOffset: { x, y },
        },
      }) => track(strip ? y : rtl ? max - x : x)}
    >
      {children(active)}
    </ScrollView>
  );
}

export function PanelPage({
  children,
  width,
  height,
  viewHeight,
  strip,
  loading,
  active,
}: {
  children: ReactNode;
  width: number;
  height: number;
  viewHeight: number;
  strip: boolean;
  loading: boolean;
  active: boolean;
}) {
  const drawing = (
    <YStack width={width} height={height} backgroundColor={loading ? "$line" : undefined}>
      {!loading && children}
    </YStack>
  );
  const overflow = !strip && height > viewHeight;
  return (
    <YStack
      width={width}
      height={strip ? height : viewHeight}
      flexShrink={component.base.none}
      accessibilityRole={loading ? undefined : "listitem"}
      aria-current={!loading && active ? true : undefined}
      {...(isWeb
        ? {
            style: { scrollSnapAlign: strip ? undefined : "start", overflowY: overflow ? "auto" : "hidden" },
            dir: "auto",
          }
        : {})}
    >
      {!isWeb && overflow ? (
        <ScrollView nestedScrollEnabled scrollEnabled={!loading}>
          {drawing}
        </ScrollView>
      ) : (
        drawing
      )}
    </YStack>
  );
}
