import { useEffect, useRef, type RefObject } from "react";
import { isWeb } from "tamagui";
import { size, snapNumber } from "../../../catalog";
import { useKit } from "../../provider";

type End = { address: string; value: number; min: number; max: number; disabled: boolean };
type Ends = readonly [End, End];
type Track = { min: number; max: number; step: number; ends: Ends; disabled: boolean; inset?: number };

function closest([lower, upper]: Ends, position: number) {
  if (lower.disabled) return upper.disabled ? undefined : upper;
  if (upper.disabled) return lower;
  return position < (lower.value + upper.value) / 2 ? lower : upper;
}

/** Once a thumb is chosen it owns the gesture, even when it reaches its peer. */
export function rangeGesture(
  { min, max, step, ends, inset = size.control.md / 2 }: Track,
  width: number,
  write: (address: string, value: number) => void,
) {
  const available = width - 2 * inset;
  let target: End | undefined;
  let previous: number | undefined;
  return (x: number) => {
    if (available <= 0 || !Number.isFinite(x)) return;
    const position = min + ((x - inset) / available) * (max - min);
    const coincident = ends[0].value === ends[1].value;
    const onThumb = Math.abs(position - ends[0].value) <= (size.icon.lg / 2 / available) * (max - min);
    if (!target && coincident && onThumb) return;
    target ??= closest(ends, position);
    if (!target) return;
    const next = snapNumber(position, target.min, target.max, step);
    if (next === (previous ?? target.value)) return;
    previous = next;
    write(target.address, next);
  };
}

type Touch = { nativeEvent: { locationX: number } };
type Begin = (width: number) => (x: number) => void;

function webRangeHandlers(begin: Begin, stop: RefObject<(() => void) | undefined>) {
  return {
    onPointerDown: (event: PointerEvent) => {
      if (event.isPrimary === false || event.button !== 0 || stop.current) return;
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const update = begin(rect.width);
      update(event.clientX - rect.left);
      const move = (next: PointerEvent) => {
        if (next.pointerId === event.pointerId) update(next.clientX - rect.left);
      };
      const end = (next: PointerEvent) => {
        if (next.pointerId === event.pointerId) stop.current?.();
      };
      stop.current = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", end);
        document.removeEventListener("pointercancel", end);
        stop.current = undefined;
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", end);
      document.addEventListener("pointercancel", end);
    },
  };
}

export function useRangeGesture(track: Track) {
  const { controller, interactive } = useKit();
  const width = useRef(0);
  const stop = useRef<() => void>(undefined);
  const moveNative = useRef<(x: number) => void>(undefined);
  const { min, max, step, disabled, ends, inset } = track;
  const [lower, upper] = ends;
  useEffect(
    () => () => {
      stop.current?.();
      moveNative.current = undefined;
    },
    [
      controller,
      interactive,
      min,
      max,
      step,
      disabled,
      inset,
      lower.address,
      upper.address,
      lower.disabled,
      upper.disabled,
    ],
  );
  if (!interactive || !controller || disabled || ends.every((end) => end.disabled)) return { width };
  const begin = (width: number) =>
    rangeGesture(track, width, (address, value) => controller.act({ address, action: "set", value }));
  if (!isWeb)
    return {
      width,
      handlers: {
        onStartShouldSetResponder: () => true,
        onResponderGrant: ({ nativeEvent: { locationX } }: Touch) => {
          moveNative.current = begin(width.current);
          moveNative.current(locationX);
        },
        onResponderMove: ({ nativeEvent: { locationX } }: Touch) => moveNative.current?.(locationX),
        onResponderRelease: () => {
          moveNative.current = undefined;
        },
        onResponderTerminate: () => {
          moveNative.current = undefined;
        },
      },
    };
  return { width, handlers: webRangeHandlers(begin, stop) };
}
