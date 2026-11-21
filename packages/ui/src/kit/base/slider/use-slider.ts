import { useEffect, useRef, type RefObject } from "react";
import { isWeb } from "tamagui";
import { size } from "../../../catalog";
import { useKit } from "../../provider";

type SliderControl = {
  address: string;
  part: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  inset?: number;
  action?: "set" | "seek" | undefined;
};
function webHandlers(
  { min, max, value, step = 1, inset = size.icon.lg }: SliderControl,
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
      const rect = node.getBoundingClientRect();
      const pointer = event.pointerId;
      const position = (x: number) =>
        min + ((x - rect.left - inset / 2) / Math.max(1, rect.width - inset)) * (max - min);
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
export function useSlider(control: SliderControl) {
  const { address, part, value, min, max, step = 1, disabled = false } = control;
  const kit = useKit();
  const width = useRef(0);
  const drag = useRef<(() => void) | null>(null);
  useEffect(
    () => () => drag.current?.(),
    [address, disabled, kit.controller, kit.interactive, min, max, step, control.inset, control.action],
  );
  const dispatch = (next: number) => {
    if (disabled || !Number.isFinite(next)) return;
    const interval = Number.isFinite(step) && step > 0 ? step : 1;
    const last = Math.max(0, Math.floor((max - min) / interval));
    const index = Math.min(last, Math.max(0, Math.round((next - min) / interval)));
    return kit.controller?.act({
      address,
      action: control.action ?? (part === "scrubber" ? "seek" : "set"),
      value: Number((min + index * interval).toPrecision(15)),
    });
  };
  const handlers =
    disabled || !kit.interactive || !kit.controller
      ? {}
      : isWeb
        ? webHandlers(control, dispatch, drag)
        : {
            onStartShouldSetResponder: () => true,
            onResponderGrant: (event: { nativeEvent: { locationX: number } }) =>
              dispatch(min + (event.nativeEvent.locationX / Math.max(1, width.current)) * (max - min)),
            onResponderMove: (event: { nativeEvent: { locationX: number } }) =>
              dispatch(min + (event.nativeEvent.locationX / Math.max(1, width.current)) * (max - min)),
            accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
            onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) =>
              dispatch(value + (event.nativeEvent.actionName === "increment" ? step : -step)),
          };
  return { width, handlers };
}
