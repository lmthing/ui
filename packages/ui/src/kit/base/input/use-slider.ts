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
};
function webHandlers({ min, max, value }: SliderControl, dispatch: (next: number) => void) {
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
              ? value + 1
              : event.key === "ArrowLeft" || event.key === "ArrowDown"
                ? value - 1
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
        Math.round(min + ((x - rect.left - thumb / 2) / (rect.width - thumb)) * (max - min));
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
  const { address, part, value, min, max } = control;
  const kit = useKit();
  const width = useRef(0);
  const dispatch = (next: number) =>
    kit.controller?.act({
      address,
      action: part === "scrubber" ? "seek" : "set",
      value: Math.min(max, Math.max(min, next)),
    });
  const handlers =
    !kit.interactive || !kit.controller
      ? {}
      : isWeb
        ? webHandlers(control, dispatch)
        : {
            onStartShouldSetResponder: () => true,
            onResponderGrant: (event: { nativeEvent: { locationX: number } }) =>
              dispatch(
                Math.round(min + (event.nativeEvent.locationX / Math.max(1, width.current)) * (max - min)),
              ),
            onResponderMove: (event: { nativeEvent: { locationX: number } }) =>
              dispatch(
                Math.round(min + (event.nativeEvent.locationX / Math.max(1, width.current)) * (max - min)),
              ),
            accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
            onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) =>
              dispatch(value + (event.nativeEvent.actionName === "increment" ? 1 : -1)),
          };
  return { width, handlers };
}
