import { useCallback, useLayoutEffect, useRef, type ContextType, type RefObject } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import type { PartRefScope } from "../../part";
import {
  manualScrollActive,
  revealNativePart,
  type NativePart,
  type ScrollActivity,
  type ScrollHandle,
} from "./scroll-follow";
import { listenForWebScroll, revealWebPart, stopWebFollow } from "./scroll-web";

type Follow = { address?: string | undefined; enabled: boolean };
type Layout = { width: number; height: number };

export function useScrollFollow(
  follow: Follow | undefined,
  scroll: RefObject<ScrollHandle | null>,
  layout: RefObject<Layout>,
  ready: boolean,
  horizontal: boolean,
  animated: boolean,
) {
  const refs = useRef(new Map<string, RefObject<TamaguiElement | null>>());
  const activity = useRef<ScrollActivity>({
    dragging: false,
    momentum: false,
    lastManual: -Infinity,
    offset: 0,
  });
  const auto = useRef({ until: 0, animating: false });
  const optedIn = follow !== undefined;
  const address = follow?.enabled && ready ? follow.address : undefined;
  const register = useCallback<NonNullable<ContextType<typeof PartRefScope>>>((key, ref) => {
    refs.current.set(key, ref);
    return () => {
      if (refs.current.get(key) === ref) refs.current.delete(key);
    };
  }, []);
  useLayoutEffect(() => {
    const node = isWeb && optedIn ? scroll.current?.getScrollableNode?.() : undefined;
    if (node) return listenForWebScroll(node, activity.current, auto.current);
  }, [scroll, optedIn]);
  const animation = useRef(animated);
  useLayoutEffect(() => {
    animation.current = animated;
  }, [animated]);
  useFollowRequest({ address, scroll, layout, horizontal, animation, activity, refs, auto });
  return {
    register: optedIn ? register : null,
    manualKey: () => {
      if (!optedIn || !isWeb) return;
      const node = scroll.current?.getScrollableNode?.();
      if (node) stopWebFollow(node, auto.current);
      auto.current.until = 0;
      activity.current.lastManual = performance.now();
    },
    nativeProps: optedIn && !isWeb ? nativeScrollEvents(activity.current, horizontal) : {},
  };
}

function useFollowRequest({
  address,
  scroll,
  layout,
  horizontal,
  animation,
  activity,
  refs,
  auto,
}: {
  address: string | undefined;
  scroll: RefObject<ScrollHandle | null>;
  layout: RefObject<Layout>;
  horizontal: boolean;
  animation: RefObject<boolean>;
  activity: RefObject<ScrollActivity>;
  refs: RefObject<Map<string, RefObject<TamaguiElement | null>>>;
  auto: RefObject<{ until: number; animating: boolean }>;
}) {
  useLayoutEffect(() => {
    if (!address || manualScrollActive(activity.current, performance.now())) return;
    let active = true;
    let stop: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      const handle = scroll.current,
        target = refs.current.get(address)?.current;
      const canReveal = () =>
        active &&
        refs.current.get(address)?.current === target &&
        !manualScrollActive(activity.current, performance.now());
      if (!handle || !target || !canReveal()) return;
      if (isWeb) {
        const node = handle.getScrollableNode?.();
        if (!node) return;
        revealWebPart(node, target as HTMLElement, horizontal, animation.current, auto.current);
        stop = () => stopWebFollow(node, auto.current);
      } else {
        const interrupt = revealNativePart(handle, target as NativePart, horizontal, animation.current, () =>
          canReveal()
            ? {
                offset: activity.current.offset,
                extent: horizontal ? layout.current.width : layout.current.height,
              }
            : undefined,
        );
        stop = () => interrupt?.(activity.current.offset);
      }
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      if (scroll.current && !manualScrollActive(activity.current, performance.now())) stop?.();
    };
  }, [address, horizontal, layout, scroll, animation, activity, refs, auto]);
}

function nativeScrollEvents(activity: ScrollActivity, horizontal: boolean) {
  const manual = () => (activity.lastManual = performance.now());
  return {
    scrollEventThrottle: 16,
    onScroll: ({ nativeEvent }: { nativeEvent: { contentOffset: { x: number; y: number } } }) => {
      activity.offset = horizontal ? nativeEvent.contentOffset.x : nativeEvent.contentOffset.y;
      if (manualScrollActive(activity, performance.now())) manual();
    },
    onScrollBeginDrag: () => {
      activity.dragging = true;
      activity.momentum = false;
      manual();
    },
    onScrollEndDrag: () => {
      activity.dragging = false;
      manual();
    },
    onMomentumScrollBegin: () => {
      activity.momentum = manualScrollActive(activity, performance.now());
    },
    onMomentumScrollEnd: () => {
      if (activity.momentum) manual();
      activity.momentum = false;
    },
  };
}
