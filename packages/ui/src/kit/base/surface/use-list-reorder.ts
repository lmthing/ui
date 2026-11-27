import { useLayoutEffect, useRef } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import { motionEase, motionProfiles } from "../../../catalog";
import { useKit } from "../../provider";
import { announceMotionSettled } from "../../part";

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
    let moved = false;
    for (const row of Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-list-motion]"))) {
      const key = row.dataset.listMotion!;
      const y = row.offsetTop;
      next.set(key, y);
      const from = old.get(key);
      if (from === undefined || from === y) continue;
      moved = true;
      if (!reduce && row.animate) {
        animations.push(
          row.animate(rowFrames(from - y), {
            duration: motionProfiles[motion].navigation,
            easing: motionEase,
          }),
        );
      }
    }
    previous.current = next;
    if (moved)
      void Promise.allSettled(animations.map((flight) => flight.finished)).then(() =>
        announceMotionSettled(root),
      );
    return () => animations.forEach((animation) => animation.cancel());
  }, [order, motion, reduce]);
  return ref;
}

function rowFrames(delta: number): Keyframe[] {
  const first = { transform: `translateY(${delta}px)`, opacity: 1 };
  const last = { transform: "none", opacity: 1 };
  // The row moving down yields visually while it passes the row coming up.
  return delta > 0
    ? [first, last]
    : [
        first,
        { transform: `translateY(${delta * 0.8}px)`, opacity: 0, offset: 0.2 },
        { transform: `translateY(${delta * 0.2}px)`, opacity: 0, offset: 0.8 },
        last,
      ];
}
