import { useCallback, useLayoutEffect, useRef, type ContextType, type RefObject } from "react";
import { isIos } from "@tamagui/core";
import { isWeb, type TamaguiElement } from "tamagui";
import type { PartRefScope } from "../../part";
import {
  beginNativeDrag,
  endNativeDrag,
  expectNativeFollow,
  manualScrollActive,
  measureNativeOffset,
  recordNativeScroll,
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
    // A caller can first enable follow while a gesture is already in progress.
    const node = isWeb ? scroll.current?.getScrollableNode?.() : undefined;
    if (node) return listenForWebScroll(node, activity.current, auto.current);
  }, [scroll]);
  // Android's smooth scrollTo animator is not stopped by a non-animated scrollTo.
  const animate = animated && (isWeb || isIos);
  const animation = useRef(animate);
  useLayoutEffect(() => {
    animation.current = animate;
    if (!optedIn) {
      if (isIos) activity.current.offset = undefined;
      activity.current.command = undefined;
    }
  }, [animate, optedIn]);
  useFollowRequest({ address, scroll, layout, horizontal, animation, activity, refs, auto });
  return {
    register: optedIn ? register : null,
    manualKey: () => {
      if (!isWeb) return;
      const node = scroll.current?.getScrollableNode?.();
      if (node) stopWebFollow(node, auto.current);
      auto.current.until = 0;
      activity.current.lastManual = performance.now();
    },
    // Android uses scroll events to recover interrupted drags, even before follow is configured.
    nativeProps: isWeb ? {} : nativeScrollEvents(activity, optedIn || !isIos),
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
            isIos ? undefined : (offset) => expectNativeFollow(activity.current, offset, performance.now()),
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

function nativeScrollEvents(state: RefObject<ScrollActivity>, trackOffset: boolean) {
  const manual = () => (state.current.lastManual = performance.now());
  const endDrag = () => endNativeDrag(state.current, performance.now());
  return {
    ...(trackOffset
      ? {
          scrollEventThrottle: 16,
          onScroll: ({ nativeEvent }: { nativeEvent: { contentOffset: { x: number; y: number } } }) =>
            recordNativeScroll(state.current, nativeEvent.contentOffset, performance.now(), !isIos),
        }
      : {}),
    onScrollBeginDrag: () => beginNativeDrag(state.current, performance.now(), !isIos),
    onScrollEndDrag: endDrag,
    onTouchCancel: endDrag,
    onMomentumScrollBegin: () => {
      state.current.momentum = manualScrollActive(state.current, performance.now());
    },
    onMomentumScrollEnd: () => {
      if (state.current.momentum) manual();
      state.current.momentum = false;
    },
  };
}
