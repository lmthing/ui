import { useLayoutEffect, useRef } from "react";
import { isWeb } from "tamagui";

type Press = {
  begin(at: number): void;
  end(releasedAt?: number): void;
  /** Assistive activation without a preceding native press-in. */
  activate?(): void;
};
type Input = { type: "pointer"; pointer: number } | { type: "keyboard"; key: string } | { type: "native" };
type Timed = { timeStamp?: number | undefined };
type Key = Timed & {
  key?: string;
  repeat?: boolean;
  preventDefault(): void;
  stopPropagation(): void;
};
type Pointer = Timed & { button: number; pointerId: number; isPrimary?: boolean };
type Move = Pointer & {
  clientX: number;
  clientY: number;
  currentTarget: { getBoundingClientRect(): { left: number; right: number; top: number; bottom: number } };
};

function stopKey(e: Key): e is Key & { key: " " | "Enter" } {
  if (e.key !== " " && e.key !== "Enter") return false;
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

function inputTime({ timeStamp }: Timed) {
  const now = performance.now();
  if (timeStamp === undefined || !Number.isFinite(timeStamp)) return now;
  const origin = performance.timeOrigin || Date.now() - now;
  return Math.min(now, timeStamp >= origin ? timeStamp - origin : timeStamp);
}

function pointerEvents(
  begin: (input: Input, at: number) => void,
  isPointer: (e: Pointer) => boolean,
  finish: (releasedAt?: number) => void,
) {
  const cancel = (e: Pointer) => {
    if (isPointer(e)) finish();
  };
  return {
    onPointerDown: (e: Pointer) => {
      if (e.isPrimary !== false && e.button === 0)
        begin({ type: "pointer", pointer: e.pointerId }, inputTime(e));
    },
    onPointerUp: (e: Move) => {
      if (isPointer(e)) finish(outside(e) ? undefined : inputTime(e));
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
  const finish = (releasedAt?: number) => {
    if (!source.current) return;
    source.current = null;
    latest.current.end(releasedAt);
  };
  const cancel = () => finish();
  useCancelPress(enabled, scope, address, cancel);
  const begin = (input: Input, at: number) => {
    if (!enabled || source.current) return;
    source.current = input;
    latest.current.begin(at);
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
            if (stopKey(e) && !e.repeat) begin({ type: "keyboard", key: e.key }, inputTime(e));
          },
          onKeyUp: (e: Key) => {
            if (stopKey(e) && source.current?.type === "keyboard" && source.current.key === e.key)
              finish(inputTime(e));
          },
        }
      : {
          onPressIn: (e: Timed) => begin({ type: "native" }, inputTime(e)),
          onPressOut: () => {
            const input = source.current;
            // Native Pressability emits onPress for release, but only onPressOut for cancellation.
            queueMicrotask(() => {
              if (input === source.current) cancel();
            });
          },
          onPress: (e: Timed) => {
            if (source.current) finish(inputTime(e));
            else latest.current.activate?.();
          },
          onBlur: cancel,
        }
    : {};
}
