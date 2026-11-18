import { useEffect, useRef, useState } from "react";
import { space } from "../../catalog";
import { useKit } from "../provider";
type Touch = { nativeEvent: { pageX: number; pageY: number } };
type Gesture = {
  begin(x: number, y: number): void;
  move(x: number, y: number): void;
  end(x: number, y: number): void;
  cancel(): void;
  origin(): { x: number; y: number } | undefined;
};
function pointerHandlers(gesture: Gesture, cleanup: { current: (() => void) | undefined }) {
  return {
    onPointerDown: (event: PointerEvent) => {
      if (event.button !== 0) return;
      cleanup.current?.();
      gesture.begin(event.clientX, event.clientY);
      const track = (next: PointerEvent) => gesture.move(next.clientX, next.clientY);
      const release = (next: PointerEvent) => {
        gesture.end(next.clientX, next.clientY);
        cleanup.current?.();
      };
      const cancel = () => {
        gesture.cancel();
        cleanup.current?.();
      };
      document.addEventListener("pointermove", track);
      document.addEventListener("pointerup", release);
      document.addEventListener("pointercancel", cancel);
      cleanup.current = () => {
        document.removeEventListener("pointermove", track);
        document.removeEventListener("pointerup", release);
        document.removeEventListener("pointercancel", cancel);
        cleanup.current = undefined;
      };
    },
  };
}
function responderHandlers(axis: "horizontal" | "vertical", gesture: Gesture) {
  return {
    onTouchStart: (event: Touch) => gesture.begin(event.nativeEvent.pageX, event.nativeEvent.pageY),
    onStartShouldSetResponder: () => axis === "vertical",
    onMoveShouldSetResponder: (event: Touch) => {
      const origin = gesture.origin();
      return Boolean(
        origin &&
        Math.abs(event.nativeEvent.pageX - origin.x) > space.sm &&
        Math.abs(event.nativeEvent.pageX - origin.x) > Math.abs(event.nativeEvent.pageY - origin.y),
      );
    },
    onResponderGrant: (event: Touch) => {
      if (!gesture.origin()) gesture.begin(event.nativeEvent.pageX, event.nativeEvent.pageY);
    },
    onResponderMove: (event: Touch) => gesture.move(event.nativeEvent.pageX, event.nativeEvent.pageY),
    onResponderRelease: (event: Touch) => gesture.end(event.nativeEvent.pageX, event.nativeEvent.pageY),
    onResponderTerminate: gesture.cancel,
  };
}
/** Pointer and native responder events share one direction/threshold calculation. */
export function swipeDirection(
  dx: number,
  dy: number,
  axis: "horizontal" | "vertical",
): "left" | "right" | "down" | undefined {
  if (axis === "vertical") return dy >= space["3xl"] && Math.abs(dy) > Math.abs(dx) ? "down" : undefined;
  return Math.abs(dx) >= space["3xl"] && Math.abs(dx) > Math.abs(dy)
    ? dx < 0
      ? "left"
      : "right"
    : undefined;
}
export function useSwipe(
  axis: "horizontal" | "vertical",
  enabled: boolean,
  onSwipe: (direction: "left" | "right" | "down") => void,
) {
  const { environment } = useKit();
  const start = useRef<{ x: number; y: number } | undefined>(undefined);
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const callback = useRef(onSwipe);
  callback.current = onSwipe;
  const [offset, setOffset] = useState(0);
  const begin = (x: number, y: number) => {
    start.current = { x, y };
  };
  const move = (x: number, y: number) => {
    if (!start.current || environment.reduceMotion || environment.agentMode) return;
    const delta = axis === "horizontal" ? x - start.current.x : Math.max(0, y - start.current.y);
    setOffset(delta);
  };
  const end = (x: number, y: number) => {
    const origin = start.current;
    start.current = undefined;
    setOffset(0);
    if (!origin) return;
    const direction = swipeDirection(x - origin.x, y - origin.y, axis);
    if (direction) callback.current(direction);
  };
  useEffect(() => () => cleanup.current?.(), []);
  const gesture: Gesture = {
    begin,
    move,
    end,
    origin: () => start.current,
    cancel: () => {
      start.current = undefined;
      setOffset(0);
    },
  };
  const handlers = !enabled
    ? {}
    : typeof document !== "undefined"
      ? pointerHandlers(gesture, cleanup)
      : responderHandlers(axis, gesture);
  return { handlers, offset };
}
