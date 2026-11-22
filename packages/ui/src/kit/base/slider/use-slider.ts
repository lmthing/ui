import { useEffect, useRef, type RefObject } from "react";
import { isWeb } from "tamagui";
import { size, snapNumber } from "../../../catalog";
import { useKit } from "../../provider";

type SliderControl = {
  address: string;
  part: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  declared?: boolean;
  inset?: number;
  action?: "set" | "seek" | undefined;
  track?: { min: number; max: number; offset: number; width: RefObject<number> } | undefined;
};
function webHandlers(
  { min, max, value, step = 1, inset = size.icon.lg, track }: SliderControl,
  dispatch: (next: number) => void,
  drag: RefObject<(() => void) | null>,
) {
  return {
    tabIndex: 0,
    onKeyDown: (event: KeyboardEvent) => {
      const next =
        event.key === "Home"
          ? min
          : event.key === "End"
            ? max
            : event.key === "ArrowRight" || event.key === "ArrowUp"
              ? value + step
              : event.key === "ArrowLeft" || event.key === "ArrowDown"
                ? value - step
                : undefined;
      if (next !== undefined) {
        event.preventDefault();
        dispatch(next);
      }
    },
    onPointerDown: (event: PointerEvent) => {
      if (event.isPrimary === false || drag.current) return;
      const node = event.currentTarget as HTMLElement;
      const rect = (track ? (node.parentElement ?? node) : node).getBoundingClientRect();
      const pointer = event.pointerId;
      const first = track?.min ?? min;
      const span = (track?.max ?? max) - first;
      const padding = track ? 0 : inset;
      const position = (x: number) =>
        first + ((x - rect.left - padding / 2) / Math.max(1, rect.width - padding)) * span;
      dispatch(position(event.clientX));
      const move = (next: PointerEvent) => {
        if (next.pointerId === pointer) dispatch(position(next.clientX));
      };
      const up = (next: PointerEvent) => {
        if (next.pointerId === pointer) drag.current?.();
      };
      drag.current = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        drag.current = null;
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    },
  };
}

type SliderTouch = { nativeEvent: { locationX: number; pageX: number } };

function nativeHandlers(
  { min, max, value, step = 1, track }: SliderControl,
  dispatch: (next: number) => void,
  width: RefObject<number>,
  origin: RefObject<number>,
) {
  const first = track?.min ?? min;
  const span = (track?.max ?? max) - first;
  const position = (x: number) => first + (x / Math.max(1, track?.width.current ?? width.current)) * span;
  return {
    onStartShouldSetResponder: () => true,
    onResponderGrant: ({ nativeEvent: { locationX, pageX } }: SliderTouch) => {
      origin.current = (track?.offset ?? 0) * (track?.width.current ?? 0) + locationX - pageX;
      dispatch(position(track ? origin.current + pageX : locationX));
    },
    onResponderMove: ({ nativeEvent: { locationX, pageX } }: SliderTouch) =>
      dispatch(position(track ? origin.current + pageX : locationX)),
    accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
    onAccessibilityAction: ({ nativeEvent: { actionName } }: { nativeEvent: { actionName: string } }) => {
      if (actionName === "increment" || actionName === "decrement")
        dispatch(value + (actionName === "increment" ? step : -step));
    },
  };
}

export function useSlider(control: SliderControl) {
  const { address, part, value, min, max, step = 1, disabled = false } = control;
  const kit = useKit();
  const width = useRef(0);
  const origin = useRef(0);
  const drag = useRef<(() => void) | null>(null);
  useEffect(
    () => () => drag.current?.(),
    [
      address,
      disabled,
      kit.controller,
      kit.interactive,
      min,
      max,
      step,
      control.declared,
      control.inset,
      control.action,
      control.track?.min,
      control.track?.max,
    ],
  );
  const dispatch = (next: number) => {
    if (disabled || !Number.isFinite(next)) return;
    const interval = Number.isFinite(step) && step > 0 ? step : 1;
    const last = Math.max(0, Math.floor((max - min) / interval));
    const index = Math.min(last, Math.max(0, Math.round((next - min) / interval)));
    return kit.controller?.act({
      address,
      action: control.action ?? (part === "scrubber" ? "seek" : "set"),
      value: control.declared
        ? snapNumber(next, min, max, interval)
        : Number((min + index * interval).toPrecision(15)),
    });
  };
  const handlers =
    disabled || !kit.interactive || !kit.controller
      ? {}
      : isWeb
        ? webHandlers(control, dispatch, drag)
        : nativeHandlers(control, dispatch, width, origin);
  return { width, handlers };
}
