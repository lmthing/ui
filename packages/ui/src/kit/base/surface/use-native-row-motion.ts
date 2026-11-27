import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { isWeb, YStack } from "tamagui";
import { motionProfiles } from "../../../catalog";
import { animateNumber } from "../../motion";
import { useKit } from "../../provider";

export function useNativeRowMotion(order: string, exiting: boolean) {
  const { environment, motion } = useKit();
  const still = environment.agentMode || environment.reduceMotion || exiting;
  const previous = useRef<{ order: string; top: number } | undefined>(undefined);
  const cancel = useRef<(() => void) | undefined>(undefined);
  const [y, setY] = useState(0);
  useLayoutEffect(() => {
    if (still) setY(0);
    return () => cancel.current?.();
  }, [still]);
  if (isWeb) return {};
  const onLayout: ComponentProps<typeof YStack>["onLayout"] = ({ nativeEvent }) => {
    const top = nativeEvent.layout.y;
    const from = previous.current;
    previous.current = { order, top };
    if (still || !from || from.order === order || from.top === top) return;
    cancel.current?.();
    cancel.current = animateNumber(from.top - top, 0, setY, {
      duration: motionProfiles[motion].navigation,
    });
  };
  return { y: still ? 0 : y, onLayout };
}
