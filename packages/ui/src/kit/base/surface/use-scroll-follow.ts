import { useCallback, useLayoutEffect, useRef, type ContextType, type RefObject } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import type { PartRefScope } from "../../part";
import {
  manualScrollActive,
  measureNativeOffset,
  revealNativePart,
  type NativePart,
  type ScrollActivity,
  type ScrollHandle,
} from "./scroll-follow";
import { listenForWebScroll, revealWebPart, stopWebFollow, type WebScrollMotion } from "./scroll-web";

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
    if (!optedIn) {
      activity.current = { dragging: false, momentum: false, lastManual: -Infinity };
      return;
    }
    const node = isWeb ? scroll.current?.getScrollableNode?.() : undefined;
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
    nativeProps: optedIn && !isWeb ? nativeScrollEvents(activity) : {},
  };
}

type FollowRequest = {
  address: string | undefined;
  scroll: RefObject<ScrollHandle | null>;
  layout: RefObject<Layout>;
  horizontal: boolean;
  animation: RefObject<boolean>;
  activity: RefObject<ScrollActivity>;
  refs: RefObject<Map<string, RefObject<TamaguiElement | null>>>;
  auto: RefObject<WebScrollMotion>;
};

function useFollowRequest(request: FollowRequest) {
  const { address, scroll, layout, horizontal, animation, activity, refs, auto } = request;
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
        const reveal = () => {
          const interrupt = revealNativePart(
            handle,
            target as NativePart,
            horizontal,
            animation.current,
            () => {
              const offset = activity.current.offset;
              if (offset && canReveal()) {
                return { offset, extent: horizontal ? layout.current.width : layout.current.height };
              }
            },
          );
          stop = () => {
            if (activity.current.offset) interrupt?.(activity.current.offset);
          };
        };
        if (activity.current.offset) reveal();
        else
          measureNativeOffset(handle, (offset) => {
            if (!canReveal()) return;
            activity.current.offset ??= offset;
            reveal();
          });
      }
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      if (scroll.current && !manualScrollActive(activity.current, performance.now())) stop?.();
    };
  }, [address, horizontal, layout, scroll, animation, activity, refs, auto]);
}

function nativeScrollEvents(state: RefObject<ScrollActivity>) {
  const manual = () => (state.current.lastManual = performance.now());
  return {
    scrollEventThrottle: 16,
    onScroll: ({ nativeEvent }: { nativeEvent: { contentOffset: { x: number; y: number } } }) => {
      state.current.offset = nativeEvent.contentOffset;
      if (manualScrollActive(state.current, performance.now())) manual();
    },
    onScrollBeginDrag: () => {
      state.current.dragging = true;
      state.current.momentum = false;
      manual();
    },
    onScrollEndDrag: () => {
      state.current.dragging = false;
      manual();
    },
    onMomentumScrollBegin: () => {
      state.current.momentum = manualScrollActive(state.current, performance.now());
    },
    onMomentumScrollEnd: () => {
      if (state.current.momentum) manual();
      state.current.momentum = false;
    },
  };
}
