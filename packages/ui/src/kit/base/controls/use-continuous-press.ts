import { useLayoutEffect, useRef } from "react";
import { isWeb } from "tamagui";

type Press = { begin(): void; end(released: boolean): void };
type Input = { type: "pointer"; pointer: number } | { type: "keyboard"; key: string } | { type: "native" };
type Key = {
  key: string;
  repeat?: boolean;
  preventDefault(): void;
  stopPropagation(): void;
};
type Pointer = { button: number; pointerId: number; isPrimary?: boolean };
type Move = Pointer & {
  clientX: number;
  clientY: number;
  currentTarget: { getBoundingClientRect(): { left: number; right: number; top: number; bottom: number } };
};

const holdKey = (key: string) => key === " " || key === "Enter";
function stopKey(e: Key) {
  if (!holdKey(e.key)) return false;
  e.preventDefault();
  e.stopPropagation();
  return true;
}
export function buttonEvents(press: () => void) {
  return {
    onPress: press,
    ...(isWeb
      ? {
          onKeyDown: (e: Key) => {
            if (stopKey(e) && !e.repeat) press();
          },
        }
      : {}),
  };
}

function outside({ clientX, clientY, currentTarget }: Move) {
  const { left, right, top, bottom } = currentTarget.getBoundingClientRect();
  return clientX < left || clientX > right || clientY < top || clientY > bottom;
}

function pointerEvents(
  begin: (input: Input) => void,
  isPointer: (e: Pointer) => boolean,
  finish: (released: boolean) => void,
) {
  const cancel = (e: Pointer) => {
    if (isPointer(e)) finish(false);
  };
  return {
    onPointerDown: (e: Pointer) => {
      if (e.isPrimary !== false && e.button === 0) begin({ type: "pointer", pointer: e.pointerId });
    },
    onPointerUp: (e: Move) => {
      if (isPointer(e)) finish(!outside(e));
    },
    // Touch can implicitly capture the pointer, suppressing pointerleave.
    onPointerMove: (e: Move) => {
      if (outside(e)) cancel(e);
    },
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  } as object; // Tamagui declares native event types even for its DOM-only handlers.
}

function useCancelPress(enabled: boolean, scope: unknown, address: string, cancel: () => void) {
  useLayoutEffect(() => {
    if (isWeb && enabled) {
      window.addEventListener("blur", cancel);
      document.addEventListener("visibilitychange", cancel);
    }
    return () => {
      if (isWeb && enabled) {
        window.removeEventListener("blur", cancel);
        document.removeEventListener("visibilitychange", cancel);
      }
      cancel();
    };
  }, [enabled, scope, address]);
}

export function useContinuousPress(enabled: boolean, scope: unknown, address: string, press: Press) {
  const source = useRef<Input | null>(null);
  const latest = useRef(press);
  latest.current = press;
  const finish = (released: boolean) => {
    if (!source.current) return;
    source.current = null;
    latest.current.end(released);
  };
  const cancel = () => finish(false);
  useCancelPress(enabled, scope, address, cancel);
  const begin = (input: Input) => {
    if (!enabled || source.current) return;
    source.current = input;
    latest.current.begin();
  };
  const isPointer = (e: Pointer) =>
    source.current?.type === "pointer" && source.current.pointer === e.pointerId;
  return enabled
    ? isWeb
      ? {
          ...pointerEvents(begin, isPointer, finish),
          onBlur: cancel,
          onContextMenu: (event: { preventDefault(): void }) => event.preventDefault(),
          onKeyDown: (e: Key) => {
            if (stopKey(e) && !e.repeat) begin({ type: "keyboard", key: e.key });
          },
          onKeyUp: (e: Key) => {
            if (stopKey(e) && source.current?.type === "keyboard" && source.current.key === e.key)
              finish(true);
          },
        }
      : {
          onPressIn: () => begin({ type: "native" }),
          onPressOut: () => {
            const input = source.current;
            // Native Pressability emits onPress for release, but only onPressOut for cancellation.
            queueMicrotask(() => {
              if (input === source.current) cancel();
            });
          },
          onPress: () => finish(true),
          onBlur: cancel,
        }
    : {};
}
