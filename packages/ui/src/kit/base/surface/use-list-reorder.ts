import { useLayoutEffect, useRef } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import { motionEase, motionProfiles } from "../../../catalog";
import { useKit } from "../../provider";

export function useListReorder(order: string) {
  const { environment, motion } = useKit();
  const reduce = environment.reduceMotion || environment.agentMode;
  const ref = useRef<TamaguiElement>(null);
  const previous = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    if (!isWeb || !ref.current) return;
    const root = ref.current as HTMLElement;
    const old = previous.current;
    const next = new Map<string, number>();
    const animations: Animation[] = [];
    for (const row of Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-list-motion]"))) {
      const key = row.dataset.listMotion!;
      const y = row.offsetTop;
      next.set(key, y);
      const from = old.get(key);
      if (!reduce && from !== undefined && from !== y) {
        animations.push(
          row.animate([{ transform: `translateY(${from - y}px)` }, { transform: "none" }], {
            duration: motionProfiles[motion].navigation,
            easing: motionEase,
          }),
        );
      }
    }
    previous.current = next;
    return () => animations.forEach((animation) => animation.cancel());
  }, [order, motion, reduce]);
  return ref;
}
