import { useEffect, useRef, useState } from "react";
import { space } from "../../catalog";
import { useKit } from "../provider";
type Touch = { nativeEvent: { pageX: number; pageY: number } };
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
  const handlers = !enabled
    ? {}
    : typeof document !== "undefined"
      ? {
          onPointerDown: (event: PointerEvent) => {
            if (event.button !== 0) return;
            cleanup.current?.();
            begin(event.clientX, event.clientY);
            const track = (next: PointerEvent) => move(next.clientX, next.clientY);
            const release = (next: PointerEvent) => {
              end(next.clientX, next.clientY);
              cleanup.current?.();
            };
            const cancel = () => {
              start.current = undefined;
              setOffset(0);
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
        }
      : {
          onTouchStart: (event: Touch) => begin(event.nativeEvent.pageX, event.nativeEvent.pageY),
          onStartShouldSetResponder: () => axis === "vertical",
          onMoveShouldSetResponder: (event: Touch) =>
            Boolean(
              start.current &&
              Math.abs(event.nativeEvent.pageX - start.current.x) > space.sm &&
              Math.abs(event.nativeEvent.pageX - start.current.x) >
                Math.abs(event.nativeEvent.pageY - start.current.y),
            ),
          onResponderGrant: (event: Touch) => {
            if (!start.current) begin(event.nativeEvent.pageX, event.nativeEvent.pageY);
          },
          onResponderMove: (event: Touch) => move(event.nativeEvent.pageX, event.nativeEvent.pageY),
          onResponderRelease: (event: Touch) => end(event.nativeEvent.pageX, event.nativeEvent.pageY),
          onResponderTerminate: () => {
            start.current = undefined;
            setOffset(0);
          },
        };
  return { handlers, offset };
}
