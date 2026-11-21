import { useLayoutEffect, useRef } from "react";
import { isWeb } from "tamagui";

type Press = { begin(): void; end(): void };
type Input = "pointer" | "keyboard" | "native";
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

export function useContinuousPress(enabled: boolean, scope: unknown, address: string, press: Press) {
  const source = useRef<{ type: Input; pointer?: number; key?: string } | null>(null);
  const latest = useRef(press);
  latest.current = press;
  const cancel = () => {
    if (!source.current) return;
    source.current = null;
    latest.current.end();
  };
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
  const begin = (input: NonNullable<typeof source.current>) => {
    if (!enabled || source.current) return;
    source.current = input;
    latest.current.begin();
  };
  const isPointer = (e: Pointer) =>
    source.current?.type === "pointer" && source.current.pointer === e.pointerId;
  return enabled
    ? isWeb
      ? ({
          onPointerDown: (e: Pointer) => {
            if (e.isPrimary !== false && e.button === 0) begin({ type: "pointer", pointer: e.pointerId });
          },
          onPointerUp: (e: Pointer) => {
            if (isPointer(e)) cancel();
          },
          onPointerMove: (e: Move) => {
            // Touch can implicitly capture the pointer, suppressing pointerleave.
            if (isPointer(e) && outside(e)) cancel();
          },
          onPointerLeave: (e: Pointer) => {
            if (isPointer(e)) cancel();
          },
          onPointerCancel: (e: Pointer) => {
            if (isPointer(e)) cancel();
          },
          onBlur: cancel,
          onContextMenu: (event: { preventDefault(): void }) => event.preventDefault(),
          onKeyDown: (e: Key) => {
            if (stopKey(e) && !e.repeat) begin({ type: "keyboard", key: e.key });
          },
          onKeyUp: (e: Key) => {
            if (stopKey(e) && source.current?.type === "keyboard" && source.current.key === e.key) cancel();
          },
          // Tamagui declares native event types even for its DOM-only handlers.
        } as object)
      : { onPressIn: () => begin({ type: "native" }), onPressOut: cancel, onPress: () => {}, onBlur: cancel }
    : {};
}
