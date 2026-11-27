import { useLayoutEffect, useRef, useState, type ComponentProps, type RefObject } from "react";
import { isWeb, YStack, type TamaguiElement } from "tamagui";
import { motionProfiles } from "../../../catalog";
import { animateNumber } from "../../motion";
import { useKit } from "../../provider";

type NativeMeasure = {
  measureLayout?(container: unknown, done: (left: number, top: number) => void, failed: () => void): void;
};

export function useNativeRowMotion(order: string, exiting: boolean, list: RefObject<TamaguiElement | null>) {
  const { environment, motion } = useKit();
  const still = environment.agentMode || environment.reduceMotion || exiting;
  const previousOrder = useRef(order);
  const previousTop = useRef<number | undefined>(undefined);
  const row = useRef<TamaguiElement>(null);
  const [y, setY] = useState(0);
  useLayoutEffect(() => {
    if (isWeb) return;
    const changed = previousOrder.current !== order;
    previousOrder.current = order;
    const from = previousTop.current;
    if (still || !changed || from === undefined) {
      setY(0);
      return;
    }
    let alive = true;
    let stop: (() => void) | undefined;
    const node = row.current as NativeMeasure | null;
    node?.measureLayout?.(
      list.current,
      (_left, top) => {
        if (alive && top !== from)
          stop = animateNumber(from - top, 0, setY, {
            duration: motionProfiles[motion].navigation,
          });
      },
      () => {},
    );
    return () => {
      alive = false;
      stop?.();
      setY(0);
    };
  }, [list, motion, order, still]);
  if (isWeb) return {};
  const onLayout: ComponentProps<typeof YStack>["onLayout"] = ({ nativeEvent }) => {
    previousTop.current = nativeEvent.layout.y;
  };
  return { ref: row, collapsable: false, y: still ? 0 : y, onLayout };
}
