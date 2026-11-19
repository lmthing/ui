import { useRef } from "react";
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
};
function webHandlers({ min, max, value, step = 1 }: SliderControl, dispatch: (next: number) => void) {
  const thumb = size.icon.lg;
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
      const node = event.currentTarget as HTMLElement;
      const rect = node.getBoundingClientRect();
      const position = (x: number) =>
        min + ((x - rect.left - thumb / 2) / Math.max(1, rect.width - thumb)) * (max - min);
      dispatch(position(event.clientX));
      const move = (next: PointerEvent) => dispatch(position(next.clientX));
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up, { once: true });
    },
  };
}
export function useSlider(control: SliderControl) {
  const { address, part, value, min, max, step = 1, disabled = false } = control;
  const kit = useKit();
  const width = useRef(0);
  const dispatch = (next: number) => {
    if (disabled || !Number.isFinite(next)) return;
    const interval = Number.isFinite(step) && step > 0 ? step : 1;
    const last = Math.max(0, Math.floor((max - min) / interval));
    const index = Math.min(last, Math.max(0, Math.round((next - min) / interval)));
    return kit.controller?.act({
      address,
      action: part === "scrubber" ? "seek" : "set",
      value: Number((min + index * interval).toPrecision(15)),
    });
  };
  const handlers =
    disabled || !kit.interactive || !kit.controller
      ? {}
      : isWeb
        ? webHandlers(control, dispatch)
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
